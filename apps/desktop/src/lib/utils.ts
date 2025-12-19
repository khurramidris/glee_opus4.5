import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import pako from 'pako';

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

/**
 * Helper function to safely decode base64 and validate JSON
 */
function tryDecodeCharacterData(value: string): string | null {
  // First try base64 decoding
  try {
    const decoded = atob(value);
    // Verify it's valid JSON
    JSON.parse(decoded);
    return decoded;
  } catch {
    // Not valid base64 or not JSON after decoding
  }

  // Check if value itself is valid JSON (not base64 encoded)
  try {
    JSON.parse(value);
    return value;
  } catch {
    // Not JSON either
  }

  return null;
}

/**
 * Extracts character data from PNG chunks (tEXt, zTXt, iTXt)
 * Handles decompression for compressed chunks
 * Supports case-insensitive "chara" keyword matching
 */
export function extractPngChunk(buffer: ArrayBuffer): string | null {
  const view = new DataView(buffer);

  // PNG signature check
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (view.getUint8(i) !== signature[i]) {
      console.error('[extractPngChunk] Invalid PNG signature');
      return null;
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

    const dataStart = offset + 8;
    // Bounds check
    if (dataStart + length > buffer.byteLength) break;

    const data = new Uint8Array(buffer, dataStart, length);

    if (type === 'tEXt') {
      // Uncompressed text
      const text = new TextDecoder('latin1').decode(data);
      const nullIndex = text.indexOf('\0');

      if (nullIndex !== -1) {
        const keyword = text.slice(0, nullIndex);
        const value = text.slice(nullIndex + 1);

        // Case-insensitive keyword check for compatibility
        if (keyword.toLowerCase() === 'chara') {
          const decoded = tryDecodeCharacterData(value);
          if (decoded) return decoded;
          // Fallback to raw value if decoding fails
          return value;
        }
      }
    } else if (type === 'zTXt') {
      // Compressed text
      const text = new TextDecoder('latin1').decode(data);
      const nullIndex = text.indexOf('\0');

      if (nullIndex !== -1) {
        const keyword = text.slice(0, nullIndex);
        const compressionMethod = data[nullIndex + 1];

        // Case-insensitive keyword check
        if (keyword.toLowerCase() === 'chara' && compressionMethod === 0) {
          const compressedData = data.slice(nullIndex + 2);
          try {
            const decompressed = pako.inflate(compressedData);
            const value = new TextDecoder('latin1').decode(decompressed);
            const decoded = tryDecodeCharacterData(value);
            if (decoded) return decoded;
            return value;
          } catch (e) {
            console.error('[extractPngChunk] Failed to decompress zTXt:', e);
          }
        }
      }
    } else if (type === 'iTXt') {
      // International text (UTF-8)
      let pos = 0;

      // Find keyword (null-terminated)
      const keywordEnd = data.indexOf(0);
      if (keywordEnd === -1) { offset += 12 + length; continue; }

      const keyword = new TextDecoder('utf-8').decode(data.slice(0, keywordEnd));
      pos = keywordEnd + 1;

      // Case-insensitive keyword check
      if (keyword.toLowerCase() === 'chara') {
        if (pos + 2 > data.length) { offset += 12 + length; continue; }

        const compressionFlag = data[pos];
        const compressionMethod = data[pos + 1];
        pos += 2;

        // Skip language tag (null-terminated)
        while (pos < data.length && data[pos] !== 0) pos++;
        pos++;

        // Skip translated keyword (null-terminated)
        while (pos < data.length && data[pos] !== 0) pos++;
        pos++;

        if (pos >= data.length) { offset += 12 + length; continue; }

        const textData = data.slice(pos);

        try {
          let value: string;
          if (compressionFlag === 1 && compressionMethod === 0) {
            const decompressed = pako.inflate(textData);
            value = new TextDecoder('utf-8').decode(decompressed);
          } else {
            value = new TextDecoder('utf-8').decode(textData);
          }

          const decoded = tryDecodeCharacterData(value);
          if (decoded) return decoded;
          return value;
        } catch (e) {
          console.error('[extractPngChunk] Failed to parse iTXt data:', e);
        }
      }
    }

    offset += 12 + length; // length + type + data + crc
  }

  console.warn('[extractPngChunk] No chara chunk found in PNG');
  return null;
}

/**
 * Parses a response that may contain <thinking> and <RESPONSE> tags.
 * It strictly prefers content within <RESPONSE> tags.
 * If tags are missing or malformed, it attempts to strip <thinking> blocks.
 */
export function parseResponse(content: string): string {
  if (!content) return '';

  // 1. Try to extract content between <RESPONSE> tags (best case)
  const responseMatch = content.match(/<RESPONSE>([\s\S]*?)<\/RESPONSE>/i);
  if (responseMatch) {
    return responseMatch[1].trim();
  }

  // 2. If <RESPONSE> tag is open but not closed, take everything after it
  const openResponseIndex = content.toLowerCase().lastIndexOf('<response>');
  if (openResponseIndex !== -1) {
    return content.slice(openResponseIndex + 10).trim();
  }

  // 3. Handle cases where </thinking> exists but <thinking> might be missing at the start
  let parsed = content;
  const thinkingEndIndex = content.toLowerCase().lastIndexOf('</thinking>');
  if (thinkingEndIndex !== -1) {
    parsed = content.slice(thinkingEndIndex + 11);
  } else {
    // 4. Fallback: Remove everything inside <thinking>...</thinking> if properly tagged
    parsed = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  }

  // Final cleanup: remove any leftover tags
  parsed = parsed.replace(/<\/?RESPONSE>/gi, '').replace(/<\/?thinking>/gi, '');

  return parsed.trim();
}
