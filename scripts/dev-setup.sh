#!/bin/bash

# Development environment setup script
# Usage: ./scripts/dev-setup.sh

set -e

echo "🚀 Setting up Glee development environment..."
echo ""

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is required but not installed."
        echo "   Please install $1 and try again."
        exit 1
    fi
    echo "✅ $1 found"
}

echo "Checking prerequisites..."
check_command "rustc"
check_command "cargo"
check_command "node"
check_command "pnpm"

# Check Rust version
RUST_VERSION=$(rustc --version | cut -d' ' -f2)
echo "   Rust version: $RUST_VERSION"

# Check Node version
NODE_VERSION=$(node --version)
echo "   Node version: $NODE_VERSION"

echo ""
echo "Installing dependencies..."

# Install Rust dependencies (workspace)
echo "Building Rust workspace..."
cargo build

# Install Node dependencies
echo "Installing Node dependencies..."
pnpm install

# Download sidecar binary
echo ""
read -p "Download llama.cpp sidecar binary? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/download-sidecar.sh
fi

echo ""
echo "============================================"
echo "✅ Development environment setup complete!"
echo "============================================"
echo ""
echo "To start development:"
echo "  cd apps/desktop"
echo "  pnpm tauri dev"
echo ""
echo "Before first run, you'll need:"
echo "1. A GGUF model file (e.g., llama-2-7b-chat.Q4_K_M.gguf)"
echo "2. Place it in: ~/Library/Application Support/Glee/models/ (macOS)"
echo "                %APPDATA%\\Glee\\models\\ (Windows)"
echo "                ~/.local/share/glee/models/ (Linux)"
echo ""
echo "Or let the app download one on first run."
