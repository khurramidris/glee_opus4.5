import { useState, useCallback, useRef } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { readFileAsText, readFileAsBase64, extractPngChunk } from '@/lib/utils';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const { importCharacterCard } = useCharacterStore();
  const { addToast } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setSelectedFile(file); // Show the file name immediately
    
    try {
      let jsonData: string;
      let avatarBase64: string | undefined;

      if (file.type === 'image/png') {
        const buffer = await file.arrayBuffer();
        const extracted = extractPngChunk(buffer);
        
        if (!extracted) {
          throw new Error('No character data found in PNG. Ensure this is a V2 Character Card.');
        }
        
        jsonData = extracted;
        avatarBase64 = await readFileAsBase64(file);
      } else {
        // Assume JSON
        jsonData = await readFileAsText(file);
      }

      await importCharacterCard(jsonData, avatarBase64);
      addToast({ type: 'success', message: 'Character imported successfully!' });
      onClose();
    } catch (e) {
      console.error("Import error:", e);
      addToast({ type: 'error', message: `Import failed: ${e}` });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [importCharacterCard, addToast, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Character" size="md">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors min-h-[200px] flex flex-col items-center justify-center
          ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-surface-600 hover:border-surface-500'}
        `}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-surface-300">Processing {selectedFile?.name}...</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-4 text-surface-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <p className="text-surface-200 mb-4">Drag and drop a character file here<br/>(PNG or JSON)</p>
            
            {/* CLEANER BUTTON IMPLEMENTATION */}
            <input
              ref={inputRef}
              type="file"
              accept=".png,.json,application/json,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              Browse Files
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}