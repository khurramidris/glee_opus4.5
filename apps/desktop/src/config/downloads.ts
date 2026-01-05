// Download configuration for Glee installer
// Centralizes CDN URLs for easier updates and future versioning

export const DOWNLOAD_CONFIG = {
    // Cloudflare R2 base URL
    baseUrl: "https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev",

    // llama.cpp binary paths by GPU type
    binaries: {
        cuda: "/bin/llama-cuda.zip",
        rocm: "/bin/llama-rocm.zip",
        cpu: "/bin/llama-cpu.zip",
    },

    // Default model path
    model: "/models/model.gguf",

    // Version for future compatibility checks
    version: "1.0.0",
} as const;

// Helper to get full URL for a binary variant
export function getBinaryUrl(variant: keyof typeof DOWNLOAD_CONFIG.binaries): string {
    return `${DOWNLOAD_CONFIG.baseUrl}${DOWNLOAD_CONFIG.binaries[variant]}`;
}

// Helper to get full model URL
export function getModelUrl(): string {
    return `${DOWNLOAD_CONFIG.baseUrl}${DOWNLOAD_CONFIG.model}`;
}
