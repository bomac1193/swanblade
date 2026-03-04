/**
 * Training Encryption — AES-256-GCM with ephemeral session keys.
 *
 * Simplified from diamabyl's E2EE module. No passwords or recovery keys —
 * each training session generates a one-time key that encrypts files in the
 * browser before upload. The key is exported as base64 for server-side
 * decryption during training, then discarded.
 *
 * Architecture:
 *   generateTrainingKey() → CryptoKey (AES-256-GCM, extractable)
 *   exportKeyAsBase64(key) → base64 string (sent to server alongside encrypted files)
 *   encryptAudioFile(file, key) → { encrypted: ArrayBuffer, iv: string, originalSize: number }
 *   decryptAudioFile(encrypted, iv, key) → ArrayBuffer
 */

const IV_LENGTH = 12;

// ─── Helpers ───

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── Key Generation ───

/** Generate an ephemeral AES-256-GCM key for a training session */
export async function generateTrainingKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed for export to server
    ["encrypt", "decrypt"]
  );
}

/** Export a CryptoKey as a base64 string (for sending to server) */
export async function exportKeyAsBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
}

/** Import a base64 key string back into a CryptoKey */
export async function importKeyFromBase64(b64: string): Promise<CryptoKey> {
  const raw = fromBase64(b64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

// ─── File Encryption ───

export interface EncryptedFile {
  encrypted: ArrayBuffer;
  iv: string; // base64-encoded 12-byte IV
  originalSize: number;
  originalName: string;
  mimeType: string;
}

/** Encrypt an audio File in the browser before upload */
export async function encryptAudioFile(
  file: File,
  key: CryptoKey
): Promise<EncryptedFile> {
  const data = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return {
    encrypted: ciphertext,
    iv: toBase64(iv.buffer),
    originalSize: data.byteLength,
    originalName: file.name,
    mimeType: file.type || "audio/mpeg",
  };
}

/** Decrypt an encrypted audio buffer (server-side or client-side) */
export async function decryptAudioFile(
  encrypted: ArrayBuffer,
  ivBase64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(fromBase64(ivBase64));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
}
