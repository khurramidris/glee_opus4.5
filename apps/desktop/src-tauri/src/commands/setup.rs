use tauri::State;
use crate::state::AppState;
use std::process::Command;
use serde::Serialize;
use std::os::windows::process::CommandExt;

#[allow(dead_code)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize)]
pub struct SetupStatus {
    pub is_complete: bool,
    pub missing_binary: bool,
    pub missing_model: bool,
    pub detected_gpu: String,
    pub recommended_variant: String, // "cuda", "rocm", "cpu"
}

#[tauri::command]
pub async fn check_setup_status(state: State<'_, AppState>) -> Result<SetupStatus, String> {
    tracing::info!("=== Starting Setup Status Check ===");
    
    // 1. Detect GPU with robust fallback methods
    let (gpu_name, variant) = detect_hardware();
    tracing::info!("GPU Detection Result: {} -> variant: {}", gpu_name, variant);
    
    // 2. Check for llama-server binary - check multiple locations like the sidecar module does
    let sidecar_name = "llama-server.exe";
    let bin_dir = state.paths.data_dir.join("bin");
    let bin_path = bin_dir.join(sidecar_name);
    
    // Check all possible locations (same as find_sidecar_binary in sidecar/mod.rs)
    let possible_binary_paths = vec![
        bin_path.clone(), // %APPDATA%/com.glee.app/bin/llama-server.exe
        std::path::PathBuf::from("resources").join(sidecar_name),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join(sidecar_name)))
            .unwrap_or_default(),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("resources").join(sidecar_name)))
            .unwrap_or_default(),
    ];
    
    let binary_found = possible_binary_paths.iter().any(|p| {
        let exists = p.exists();
        tracing::debug!("Checking binary path: {:?} exists={}", p, exists);
        exists
    });
    let missing_binary = !binary_found;
    
    if binary_found {
        let found_path = possible_binary_paths.iter().find(|p| p.exists());
        tracing::info!("Binary found at: {:?}", found_path);
    } else {
        tracing::info!("Binary NOT found in any location.");
    }
    
    // 3. Check for model file - check both default location AND user-configured path
    let default_model_path = state.paths.default_model_path();
    let mut model_found = default_model_path.exists();
    tracing::debug!("Default model path: {:?} exists={}", default_model_path, model_found);
    
    // Also check user-configured model path from settings
    if !model_found {
        tracing::debug!("Checking settings for custom model path...");
        if let Ok(Some(configured_path)) = crate::repositories::SettingsRepo::get(&state.db, "model.path") {
            tracing::debug!("Found configured path in DB: '{}'", configured_path);
            if !configured_path.is_empty() {
                let user_model_path = std::path::PathBuf::from(&configured_path);
                let user_exists = user_model_path.exists();
                tracing::debug!("Custom model path: {:?} exists={}", user_model_path, user_exists);
                if user_exists {
                    tracing::info!("User-configured model found at: {:?}", user_model_path);
                    model_found = true;
                }
            }
        } else {
            tracing::debug!("No custom model path found in settings or DB error.");
        }
    }
    
    let missing_model = !model_found;
    if model_found {
        tracing::info!("Model found (default or configured)");
    } else {
        tracing::info!("Model check: default {:?} exists={}, no configured model found", default_model_path, default_model_path.exists());
    }
    
    let status = SetupStatus {
        is_complete: !missing_binary && !missing_model,
        missing_binary,
        missing_model,
        detected_gpu: gpu_name.clone(),
        recommended_variant: variant.clone(),
    };
    
    tracing::info!("Setup Status: complete={}, missing_binary={}, missing_model={}, gpu={}, variant={}",
        status.is_complete, status.missing_binary, status.missing_model, gpu_name, variant);
    tracing::info!("=== Setup Status Check Complete ===");
    
    Ok(status)
}

/// Detect GPU hardware using multiple fallback methods
/// Returns (gpu_description, variant) where variant is "cuda", "rocm", or "cpu"
fn detect_hardware() -> (String, String) {
    tracing::info!("Starting GPU detection...");
    
    // Method 1: Try wmic (fastest, most reliable on most Windows systems)
    if let Some(result) = try_wmic_detection() {
        tracing::info!("WMIC detection succeeded: {:?}", result);
        return result;
    }
    
    // Method 2: Try PowerShell Get-CimInstance (works when wmic fails)
    if let Some(result) = try_powershell_detection() {
        tracing::info!("PowerShell detection succeeded: {:?}", result);
        return result;
    }
    
    // Method 3: Try reading from registry (last resort)
    if let Some(result) = try_registry_detection() {
        tracing::info!("Registry detection succeeded: {:?}", result);
        return result;
    }
    
    // All methods failed - default to CPU
    tracing::warn!("All GPU detection methods failed. Defaulting to CPU variant.");
    tracing::warn!("This is normal on some systems. The app will work but may be slower.");
    ("CPU Mode (no GPU detected)".to_string(), "cpu".to_string())
}

/// Try GPU detection using wmic command
fn try_wmic_detection() -> Option<(String, String)> {
    tracing::debug!("Trying WMIC detection...");
    
    let output = Command::new("wmic")
        .args(&["path", "win32_videocontroller", "get", "name"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            if !o.status.success() {
                tracing::debug!("WMIC command failed with status: {:?}", o.status);
                return None;
            }
            
            let stdout = String::from_utf8_lossy(&o.stdout);
            tracing::debug!("WMIC output: {}", stdout.trim());
            
            let stdout_lower = stdout.to_lowercase();
            
            if stdout_lower.contains("nvidia") {
                // Extract actual GPU name for better UX
                let gpu_name = extract_gpu_name(&stdout, "nvidia");
                Some((gpu_name, "cuda".to_string()))
            } else if stdout_lower.contains("amd") || stdout_lower.contains("radeon") {
                let gpu_name = extract_gpu_name(&stdout, "radeon");
                Some((gpu_name, "rocm".to_string()))
            } else if stdout_lower.contains("intel") {
                Some(("Intel Integrated Graphics".to_string(), "cpu".to_string()))
            } else if stdout.trim().len() > 10 {
                // Got some output but no recognized GPU
                Some(("Integrated Graphics".to_string(), "cpu".to_string()))
            } else {
                tracing::debug!("WMIC returned empty or invalid output");
                None
            }
        }
        Err(e) => {
            tracing::debug!("WMIC command error: {}", e);
            None
        }
    }
}

/// Try GPU detection using PowerShell Get-CimInstance
fn try_powershell_detection() -> Option<(String, String)> {
    tracing::debug!("Trying PowerShell detection...");
    
    let output = Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-NonInteractive", 
            "-Command",
            "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name"
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            if !o.status.success() {
                tracing::debug!("PowerShell command failed with status: {:?}", o.status);
                return None;
            }
            
            let stdout = String::from_utf8_lossy(&o.stdout);
            tracing::debug!("PowerShell output: {}", stdout.trim());
            
            let stdout_lower = stdout.to_lowercase();
            
            if stdout_lower.contains("nvidia") {
                let gpu_name = extract_gpu_name(&stdout, "nvidia");
                Some((gpu_name, "cuda".to_string()))
            } else if stdout_lower.contains("amd") || stdout_lower.contains("radeon") {
                let gpu_name = extract_gpu_name(&stdout, "radeon");
                Some((gpu_name, "rocm".to_string()))
            } else if stdout_lower.contains("intel") {
                Some(("Intel Integrated Graphics".to_string(), "cpu".to_string()))
            } else if stdout.trim().len() > 5 {
                Some(("Integrated Graphics".to_string(), "cpu".to_string()))
            } else {
                tracing::debug!("PowerShell returned empty or invalid output");
                None
            }
        }
        Err(e) => {
            tracing::debug!("PowerShell command error: {}", e);
            None
        }
    }
}

/// Try GPU detection by reading Windows registry
fn try_registry_detection() -> Option<(String, String)> {
    tracing::debug!("Trying Registry detection...");
    
    // Query the display adapter registry keys
    let output = Command::new("reg")
        .args(&[
            "query",
            r"HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000",
            "/v",
            "DriverDesc"
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            if !o.status.success() {
                tracing::debug!("Registry query failed with status: {:?}", o.status);
                return None;
            }
            
            let stdout = String::from_utf8_lossy(&o.stdout);
            tracing::debug!("Registry output: {}", stdout.trim());
            
            let stdout_lower = stdout.to_lowercase();
            
            if stdout_lower.contains("nvidia") {
                Some(("NVIDIA GPU Detected".to_string(), "cuda".to_string()))
            } else if stdout_lower.contains("amd") || stdout_lower.contains("radeon") {
                Some(("AMD GPU Detected".to_string(), "rocm".to_string()))
            } else if stdout_lower.contains("intel") {
                Some(("Intel Integrated Graphics".to_string(), "cpu".to_string()))
            } else {
                tracing::debug!("Registry returned no recognized GPU");
                None
            }
        }
        Err(e) => {
            tracing::debug!("Registry command error: {}", e);
            None
        }
    }
}

/// Extract the actual GPU model name from command output
fn extract_gpu_name(output: &str, brand: &str) -> String {
    // Try to find a line containing the brand name
    for line in output.lines() {
        let line_lower = line.to_lowercase();
        if line_lower.contains(brand) {
            let trimmed = line.trim();
            if !trimmed.is_empty() && trimmed.to_lowercase() != "name" {
                return format!("{} Detected", trimmed);
            }
        }
    }
    
    // Fallback to generic name
    match brand {
        "nvidia" => "NVIDIA GPU Detected".to_string(),
        "radeon" | "amd" => "AMD GPU Detected".to_string(),
        _ => "GPU Detected".to_string(),
    }
}

