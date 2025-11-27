import { useState, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { readFileAsBase64 } from '@/lib/utils';
import { MAX_AVATAR_SIZE, SUPPORTED_AVATAR_TYPES } from '@/lib/constants';

interface AvatarUploaderProps {
  currentPath?: string;
  onUpload: (path: string) => void;
}

export function AvatarUploader({ currentPath, onUpload }: AvatarUploaderProps) {
  const { addToast } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_AVATAR_TYPES.includes(file.type)) {
      addToast({ type: 'error', message: 'Please select a PNG, JPEG, or WebP image' });
      return;
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      addToast({ type: 'error', message: 'Image must be less than 10MB' });
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      setPreview(base64);
      
      // For now, we store the base64 as the path
      // In a real app, you'd upload to the backend and get a path back
      onUpload(base64);
    } catch (e) {
      addToast({ type: 'error', message: 'Failed to read image' });
    } finally {
      setIsUploading(false);
    }
  };

  const displaySrc = preview || currentPath;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative group cursor-pointer"
        onClick={() => inputRef.current?.click()}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        {isUploading && (
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
      
      <button
        onClick={() => inputRef.current?.click()}
        className="text-sm text-primary-400 hover:text-primary-300"
      >
        {displaySrc ? 'Change Avatar' : 'Upload Avatar'}
      </button>
    </div>
  );
}
