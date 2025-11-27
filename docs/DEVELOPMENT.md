# Glee Development Guide

## Prerequisites

- **Rust** 1.75 or later
- **Node.js** 20 or later
- **pnpm** 8 or later
- **Platform-specific requirements:**
  - **Windows:** Visual Studio Build Tools with C++ workload
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/glee.git
cd glee

# Run setup script
./scripts/dev-setup.sh

# Start development
cd apps/desktop
pnpm tauri dev
```

## Project Structure

```
glee/
├── apps/
│   └── desktop/              # Tauri desktop application
│       ├── src/              # React frontend
│       ├── src-tauri/        # Rust backend
│       └── package.json
├── resources/                # Bundled resources
├── scripts/                  # Build and setup scripts
└── docs/                     # Documentation
```

## Development Workflow

### Running the App

```bash
cd apps/desktop
pnpm tauri dev
```

This starts both the Vite dev server (frontend) and the Tauri dev process (backend).

### Building for Production

```bash
cd apps/desktop
pnpm tauri build
```

Outputs are in `apps/desktop/src-tauri/target/release/bundle/`.

### Running Tests

```bash
# Rust tests
cargo test

# Frontend tests (if configured)
cd apps/desktop
pnpm test
```

## Model Setup

Glee requires a GGUF model file to function. Options:

### Option 1: Let the App Download

On first run, Glee will offer to download a default model (~2.5GB).

### Option 2: Manual Placement

1. Download a GGUF model from [HuggingFace](https://huggingface.co/models?search=gguf)
2. Recommended: `llama-2-7b-chat.Q4_K_M.gguf` or similar
3. Place in the models directory:
   - **macOS:** `~/Library/Application Support/Glee/models/`
   - **Windows:** `%APPDATA%\Glee\models\`
   - **Linux:** `~/.local/share/glee/models/`
4. Rename to `model.gguf` or configure path in settings

## Sidecar (llama.cpp)

The app uses llama.cpp's server as a sidecar process.

### Download Pre-built Binary

```bash
# macOS/Linux
./scripts/download-sidecar.sh

# Windows
.\scripts\download-sidecar.ps1
```

### Build from Source

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make llama-server

# Copy to project
cp llama-server /path/to/glee/apps/desktop/src-tauri/resources/
```

## Common Issues

### "Model not found" error

Ensure a GGUF model file exists in the models directory.

### Sidecar fails to start

1. Check the sidecar binary exists in `src-tauri/resources/`
2. Ensure it has execute permissions (`chmod +x llama-server`)
3. Check console for detailed error messages

### Slow generation

1. Enable GPU acceleration in Settings > Model > GPU Layers
2. Use a smaller quantized model (Q4_K_M instead of Q8)
3. Reduce context size in Settings > Generation

### Build fails on Linux

Install required dependencies:

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel
```

## Architecture Overview

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Code Style

- **Rust:** Follow `rustfmt` defaults (run `cargo fmt`)
- **TypeScript:** Follow Prettier config (run `pnpm format`)
- **Commits:** Use conventional commits format
