# Glee

**Your private AI character companion. Offline. Uncensored. Yours.**

Glee is an offline-first, privacy-respecting AI character companion application. Chat with AI characters that remember you, explore branching conversations, and keep all your data local.

## Features

- 🔒 **100% Offline** - Everything runs locally on your device
- 🎭 **Character Companions** - Create and chat with custom AI characters
- 🌳 **Branching Conversations** - Explore different paths, regenerate responses
- 👤 **Personas** - Define who you are in conversations
- 📚 **Lorebooks** - World-building that auto-injects into context
- 💾 **Full Data Ownership** - Export everything, import anywhere

## Quick Start

### Download

Get the latest release for your platform from the [Releases](https://github.com/your-org/glee/releases) page.

### First Run

1. Launch Glee
2. The app will offer to download an AI model (~2.5GB)
3. Once downloaded, start chatting with the starter character
4. Create your own characters and explore!

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development setup instructions.

```bash
# Quick start
git clone https://github.com/your-org/glee.git
cd glee
./scripts/dev-setup.sh
cd apps/desktop
pnpm tauri dev
```

## Requirements

- **RAM:** 8GB minimum (16GB recommended)
- **Storage:** 5GB free space
- **OS:** Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+)
- **GPU:** Optional but recommended for faster generation

## Model Compatibility

Glee uses [llama.cpp](https://github.com/ggerganov/llama.cpp) and supports GGUF format models. Recommended models:

| RAM | Recommended Model | Size |
|-----|-------------------|------|
| 8GB | Llama 3.2 3B Q4_K_M | ~2.5GB |
| 16GB | Llama 3.1 8B Q4_K_M | ~4.5GB |
| 32GB | Llama 3.1 8B Q8_0 | ~8GB |

## Privacy

Glee is designed with privacy as a core principle:

- ✅ All data stored locally
- ✅ No accounts or cloud sync
- ✅ No telemetry or analytics
- ✅ No network access except for optional model downloads
- ✅ Full data export at any time

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop framework
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - LLM inference
- [React](https://react.dev/) - UI framework
- [TailwindCSS](https://tailwindcss.com/) - Styling
