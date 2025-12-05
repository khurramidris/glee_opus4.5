import { useState, useRef, useCallback } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { MAX_AVATAR_SIZE, SUPPORTED_AVATAR_TYPES } from '@/lib/constants';
// CHANGE: writeBinaryFile -> writeFile
import { writeFile } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';

interface AvatarUploaderProps {
  currentPath?: string;
  onUpload: (filename: string) => void;
  onClear?: () => void;
}

// ... helper functions (fileToBase64, resizeImage) remain the same ...
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resizeImage(base64: string, maxSize: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
}

export function AvatarUploader({ currentPath, onUpload, onClear }: AvatarUploaderProps) {
  const { addToast } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!SUPPORTED_AVATAR_TYPES.includes(file.type)) {
      addToast({ type: 'error', message: 'Please select a PNG, JPEG, or WebP image' });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      addToast({ type: 'error', message: 'Image must be less than 10MB' });
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 512);

      // Extract binary data
      const base64Data = resized.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Save to app data directory
      const filename = `${crypto.randomUUID()}.png`;
      const appData = await appDataDir();
      const avatarsDir = await join(appData, 'avatars');
      const filePath = await join(avatarsDir, filename);

      // CHANGE: writeBinaryFile -> writeFile
      // Note: 'writeFile' handles binary data (Uint8Array) in v2
      await writeFile(filePath, binaryData);

      // Set preview
      setPreview(resized);

      // Return path
      onUpload(filePath);

      addToast({ type: 'success', message: 'Avatar updated' });
    } catch (e) {
      console.error('Failed to save avatar:', e);
      addToast({ type: 'error', message: 'Failed to save avatar image' });
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUpload, addToast]);

  const handleClear = useCallback(() => {
    setPreview(null);
    onClear?.();
  }, [onClear]);

  const handleClick = () => inputRef.current?.click();

  const displaySrc = preview || currentPath;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        className="relative group cursor-pointer rounded-full"
      >
        <Avatar
          src={displaySrc}
          fallback="?"
          size="xl"
          className="w-24 h-24"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
        >
          {displaySrc ? 'Change' : 'Upload'}
        </button>
        {displaySrc && onClear && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isProcessing}
            className="text-sm text-surface-400 hover:text-red-400 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}