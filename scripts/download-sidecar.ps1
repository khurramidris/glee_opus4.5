# Download llama.cpp server binary for Windows
# Usage: .\scripts\download-sidecar.ps1

$ErrorActionPreference = "Stop"

$LLAMA_CPP_VERSION = "b4240"
$BASE_URL = "https://github.com/ggerganov/llama.cpp/releases/download/$LLAMA_CPP_VERSION"

# Determine binary based on CUDA availability
$BINARY_NAME = "llama-$LLAMA_CPP_VERSION-bin-win-cuda-cu12.2.0-x64.zip"
$FALLBACK_BINARY = "llama-$LLAMA_CPP_VERSION-bin-win-avx2-x64.zip"

# Create target directory
$TARGET_DIR = "apps\desktop\src-tauri\resources"
New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null

# Try CUDA version first, fallback to CPU
$DOWNLOAD_URL = "$BASE_URL/$BINARY_NAME"
$TEMP_FILE = "$env:TEMP\llama-server.zip"

Write-Host "Downloading llama.cpp server..."
Write-Host "URL: $DOWNLOAD_URL"

try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TEMP_FILE
} catch {
    Write-Host "CUDA version not available, trying CPU version..."
    $DOWNLOAD_URL = "$BASE_URL/$FALLBACK_BINARY"
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TEMP_FILE
}

# Extract
Write-Host "Extracting..."
$EXTRACT_DIR = "$env:TEMP\llama-extract"
Expand-Archive -Path $TEMP_FILE -DestinationPath $EXTRACT_DIR -Force

# Find and copy the server binary
$SERVER_PATH = Get-ChildItem -Path $EXTRACT_DIR -Recurse -Filter "llama-server.exe" | Select-Object -First 1

if ($SERVER_PATH) {
    Copy-Item $SERVER_PATH.FullName -Destination "$TARGET_DIR\llama-server.exe"
} else {
    Write-Error "Could not find llama-server.exe in archive"
    exit 1
}

# Cleanup
Remove-Item $TEMP_FILE -Force
Remove-Item $EXTRACT_DIR -Recurse -Force

Write-Host ""
Write-Host "✅ llama-server.exe downloaded to $TARGET_DIR\llama-server.exe" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Download a GGUF model file"
Write-Host "2. Place it in the models directory when the app runs"
Write-Host "   (or the app will prompt you to download one)"
