#!/bin/bash

# Download llama.cpp server binary for the current platform
# Usage: ./scripts/download-sidecar.sh

set -e

LLAMA_CPP_VERSION="b4240"
BASE_URL="https://github.com/ggerganov/llama.cpp/releases/download/${LLAMA_CPP_VERSION}"

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
    Darwin)
        if [ "$ARCH" = "arm64" ]; then
            BINARY_NAME="llama-${LLAMA_CPP_VERSION}-bin-macos-arm64.zip"
            EXTRACT_NAME="llama-server"
        else
            BINARY_NAME="llama-${LLAMA_CPP_VERSION}-bin-macos-x64.zip"
            EXTRACT_NAME="llama-server"
        fi
        ;;
    Linux)
        BINARY_NAME="llama-${LLAMA_CPP_VERSION}-bin-ubuntu-x64.zip"
        EXTRACT_NAME="llama-server"
        ;;
    *)
        echo "Unsupported OS: $OS"
        echo "Please download manually from: https://github.com/ggerganov/llama.cpp/releases"
        exit 1
        ;;
esac

# Create target directory
TARGET_DIR="apps/desktop/src-tauri/resources"
mkdir -p "$TARGET_DIR"

# Download
echo "Downloading llama.cpp server..."
DOWNLOAD_URL="${BASE_URL}/${BINARY_NAME}"
echo "URL: $DOWNLOAD_URL"

curl -L -o "/tmp/${BINARY_NAME}" "$DOWNLOAD_URL"

# Extract
echo "Extracting..."
cd /tmp
unzip -o "${BINARY_NAME}"

# Find and copy the server binary
if [ -f "build/bin/llama-server" ]; then
    cp "build/bin/llama-server" "${OLDPWD}/${TARGET_DIR}/llama-server"
elif [ -f "llama-server" ]; then
    cp "llama-server" "${OLDPWD}/${TARGET_DIR}/llama-server"
else
    echo "Could not find llama-server binary in archive"
    exit 1
fi

cd "$OLDPWD"

# Make executable
chmod +x "${TARGET_DIR}/llama-server"

# Cleanup
rm -rf /tmp/${BINARY_NAME} /tmp/build

echo ""
echo "✅ llama-server downloaded to ${TARGET_DIR}/llama-server"
echo ""
echo "Next steps:"
echo "1. Download a GGUF model file"
echo "2. Place it in the models directory when the app runs"
echo "   (or the app will prompt you to download one)"
