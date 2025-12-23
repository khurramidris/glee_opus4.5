use tauri::State;
use crate::state::AppState;
use std::process::Command;
use serde::Serialize;
use std::os::windows::process::CommandExt;

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
    // 1. Detect GPU
    let (gpu_name, variant) = detect_hardware();
    
    // 2. Check Paths
    // We expect the binary to be in the sidecar location or a specific bin dir
    // For now, let's assume valid sidecar path is where we expect it
    // But since this is a "Download & Run" concept, we might want to check the data dir
    
    // We will look for 'llama-server.exe' in the <app_data>/bin folder
    let bin_dir = state.paths.data_dir.join("bin");
    let bin_path = bin_dir.join("llama-server.exe");
    
    // We model check
    // We check if ANY model is loaded or exists in defaults
    let model_exists = state.paths.default_model_path().exists();
    
    let missing_binary = !bin_path.exists();
    let missing_model = !model_exists;
    
    Ok(SetupStatus {
        is_complete: !missing_binary && !missing_model,
        missing_binary,
        missing_model,
        detected_gpu: gpu_name,
        recommended_variant: variant,
    })
}

fn detect_hardware() -> (String, String) {
    // Run wmic path win32_videocontroller get name
    let output = Command::new("wmic")
        .args(&["path", "win32_videocontroller", "get", "name"])
        // BETA: Console visible for debugging - re-enable for production
        // .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_lowercase();
            // stdout looks like:
            // Name
            // NVIDIA GeForce RTX 3080
            
            if stdout.contains("nvidia") {
                ("NVIDIA GPU Detected".to_string(), "cuda".to_string())
            } else if stdout.contains("amd") || stdout.contains("radeon") {
                ("AMD GPU Detected".to_string(), "rocm".to_string())
            } else {
                ("Integrated/CPU Graphics".to_string(), "cpu".to_string())
            }
        },
        Err(_) => ("Unknown".to_string(), "cpu".to_string())
    }
}
