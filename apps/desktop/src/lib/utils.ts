import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function extractPngChunk(buffer: ArrayBuffer): string | null {
  const view = new DataView(buffer);
  
  // PNG signature
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (view.getUint8(i) !== signature[i]) {
      return null; // Not a PNG
    }
  }
  
  let offset = 8;
  
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );
    
    if (type === 'tEXt') {
      const data = new Uint8Array(buffer, offset + 8, length);
      const text = new TextDecoder('latin1').decode(data);
      const nullIndex = text.indexOf('\0');
      
      if (nullIndex !== -1) {
        const keyword = text.slice(0, nullIndex);
        const value = text.slice(nullIndex + 1);
        
        if (keyword === 'chara') {
          return atob(value);
        }
      }
    }
    
    offset += 12 + length; // length + type + data + crc
  }
  
  return null;
}
