export const CLIENT_CONTENT_HASH_LIMIT = 32 * 1024 * 1024;
export const CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/;

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256Bytes(value: ArrayBuffer | Uint8Array) {
  const input = new Uint8Array(value instanceof Uint8Array ? value : new Uint8Array(value));
  return hex(await globalThis.crypto.subtle.digest("SHA-256", input));
}

export async function hashBrowserBlob(blob: Blob, limit = CLIENT_CONTENT_HASH_LIMIT): Promise<string | null> {
  if (blob.size > limit) return null;
  return sha256Bytes(await blob.arrayBuffer());
}

export function sameExactContent(first: string | null | undefined, second: string | null | undefined) {
  return Boolean(first && second && CONTENT_HASH_PATTERN.test(first) && first === second);
}
