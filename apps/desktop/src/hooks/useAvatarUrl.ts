import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { join, appDataDir } from '@tauri-apps/api/path';

/**
 * Hook to convert a relative avatar filename or an absolute path 
 * into a URL that the browser can display via Tauri's convertFileSrc.
 * Handles both legacy absolute paths and new relative filenames.
 */
export function useAvatarUrl(avatarPath?: string | null) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        async function resolveUrl() {
            if (!avatarPath) {
                setUrl(null);
                return;
            }

            // If it's already a data URL (like a preview or base64), use it as is
            if (avatarPath.startsWith('data:')) {
                setUrl(avatarPath);
                return;
            }

            try {
                // Check if it's already an absolute path (legacy) or just a filename
                // Paths usually contain slashes/backslashes
                const isPath = avatarPath.includes('/') || avatarPath.includes('\\');

                let fullPath: string;
                if (isPath) {
                    fullPath = avatarPath;
                } else {
                    // It's a relative filename, join with appData/avatars
                    const appData = await appDataDir();
                    fullPath = await join(appData, 'avatars', avatarPath);
                }

                setUrl(convertFileSrc(fullPath));
            } catch (e) {
                console.error('Failed to resolve avatar URL:', e);
                setUrl(null);
            }
        }

        resolveUrl();
    }, [avatarPath]);

    return url;
}
