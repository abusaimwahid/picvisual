import { validateMediaFile } from "./validation";
import { cloudUploadParts, DIRECT_UPLOAD_CHUNK_THRESHOLD } from "./upload-queue";
import { CLIENT_CONTENT_HASH_LIMIT } from "./content-hash";

export type UploadedMedia = { id: string; filename: string; publicUrl: string; mediaType: "IMAGE" | "VIDEO"; alt: string | null; caption?: string | null; width?: number | null; height?: number | null };
export type DuplicateMedia = UploadedMedia & { createdAt: string; usageCount: number };
export type UploadStage = "VALIDATING" | "UPLOADING" | "FINALIZING";
export type BrowserUploadOptions = { signal?: AbortSignal; onProgress?: (uploadedBytes: number, totalBytes: number) => void; onStage?: (stage: UploadStage) => void; contentHash?: string; allowDuplicate?: boolean };

export class DuplicateMediaError extends Error {
  constructor(public duplicate: DuplicateMedia, public ticket?: string) { super("Duplicate media detected."); this.name = "DuplicateMediaError"; }
}

function uploadError(status: number, responseText: string) {
  try { const value = JSON.parse(responseText) as { error?: { message?: string } | string }; const message = typeof value.error === "string" ? value.error : value.error?.message; if (message) return message; } catch { /* Use a stable user-facing fallback. */ }
  if (status === 413) return "File is larger than the storage account allows.";
  if (status === 401 || status === 403) return "Upload authorization expired. Retry this file.";
  return "Cloud storage rejected this file.";
}

function xhrRequest(url: string, body: FormData, options: { signal?: AbortSignal; headers?: Record<string, string>; onProgress?: (ratio: number) => void }) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open("POST", url);
    xhr.timeout = 30 * 60_000;
    Object.entries(options.headers ?? {}).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) options.onProgress?.(Math.max(0, Math.min(1, event.loaded / event.total))); };
    xhr.onerror = () => reject(new Error("Upload connection failed. Retry this file."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Retry this file."));
    xhr.onabort = () => reject(new DOMException("Upload canceled.", "AbortError"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(xhr.responseText); return; }
      try { const value = JSON.parse(xhr.responseText) as { duplicate?: DuplicateMedia }; if (xhr.status === 409 && value.duplicate) { reject(new DuplicateMediaError(value.duplicate)); return; } } catch { /* Use the standard upload error. */ }
      reject(new Error(uploadError(xhr.status, xhr.responseText)));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) xhr.abort(); else xhr.send(body);
    xhr.addEventListener("loadend", () => options.signal?.removeEventListener("abort", abort), { once: true });
  });
}

export async function validateBrowserFile(file: File) {
  if (file.type === "image/svg+xml" && file.size > 4 * 1024 * 1024) throw new Error("SVG files must be 4 MB or smaller.");
  const inspected = new Uint8Array(await file.slice(0, file.type === "image/svg+xml" ? file.size : 65536).arrayBuffer());
  return validateMediaFile({ name: file.name, type: file.type, size: file.size, bytes: inspected });
}

async function cleanupDirectUpload(ticket: string) {
  await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancelTicket: ticket }), keepalive: true, signal: AbortSignal.timeout(35_000) }).catch(() => undefined);
}

export async function cancelDuplicateUpload(ticket: string) { await cleanupDirectUpload(ticket); }

async function uploadSvg(file: File, options: BrowserUploadOptions) {
  const form = new FormData(); form.set("file", file); if (options.allowDuplicate) form.set("duplicateChoice", "UPLOAD_ANYWAY");
  options.onStage?.("UPLOADING");
  const responseText = await xhrRequest("/api/admin/media", form, { signal: options.signal, onProgress: (ratio) => { const bytes = Math.round(file.size * ratio); options.onProgress?.(bytes, file.size); if (bytes >= file.size) options.onStage?.("FINALIZING"); } });
  const result = JSON.parse(responseText) as { item?: UploadedMedia; error?: string };
  if (!result.item) throw new Error(result.error || "Media record could not be finalized.");
  return result.item;
}

async function uploadCloudinaryFile(file: File, url: string, parameters: Record<string, string>, options: BrowserUploadOptions) {
  options.onStage?.("UPLOADING");
  if (file.size <= DIRECT_UPLOAD_CHUNK_THRESHOLD) {
    const form = new FormData(); Object.entries(parameters).forEach(([key, value]) => form.set(key, value)); form.set("file", file);
    await xhrRequest(url, form, { signal: options.signal, onProgress: (ratio) => options.onProgress?.(Math.round(file.size * ratio), file.size) });
    return;
  }
  const uploadId = crypto.randomUUID();
  for (const { start, end } of cloudUploadParts(file.size)) {
    const chunk = file.slice(start, end, file.type);
    const form = new FormData(); Object.entries(parameters).forEach(([key, value]) => form.set(key, value)); form.set("file", chunk, file.name);
    await xhrRequest(url, form, { signal: options.signal, headers: { "Content-Range": `bytes ${start}-${end - 1}/${file.size}`, "X-Unique-Upload-Id": uploadId }, onProgress: (ratio) => options.onProgress?.(Math.min(file.size, start + Math.round(chunk.size * ratio)), file.size) });
  }
}

export async function uploadBrowserFile(file: File, options: BrowserUploadOptions = {}): Promise<UploadedMedia> {
  options.onStage?.("VALIDATING");
  const validated = await validateBrowserFile(file);
  if (validated.mimeType === "image/svg+xml") return uploadSvg(file, options);
  const response = await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, mimeType: file.type, fileSize: file.size, ...(options.contentHash ? { contentHash: options.contentHash } : {}) }), signal: options.signal });
  const signed = await response.json() as { error?: string; url?: string; parameters?: Record<string, string>; ticket?: string };
  if (!response.ok || !signed.url || !signed.parameters || !signed.ticket) throw new Error(signed.error || "Could not start upload.");
  try {
    await uploadCloudinaryFile(file, signed.url, signed.parameters, options);
    options.onProgress?.(file.size, file.size); options.onStage?.("FINALIZING");
    const timeout = file.size > CLIENT_CONTENT_HASH_LIMIT ? 5 * 60_000 : 70_000;
    const finalSignal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
    const final = await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: signed.ticket, ...(options.allowDuplicate ? { duplicateChoice: "UPLOAD_ANYWAY" } : {}) }), signal: finalSignal });
    const result = await final.json() as { item?: UploadedMedia; duplicate?: DuplicateMedia; ticket?: string; error?: string };
    if (final.status === 409 && result.duplicate) throw new DuplicateMediaError(result.duplicate, result.ticket ?? signed.ticket);
    if (!final.ok || !result.item) throw new Error(result.error || "Media record could not be finalized.");
    return result.item;
  } catch (error) {
    if (error instanceof DuplicateMediaError) throw error;
    await cleanupDirectUpload(signed.ticket);
    throw error;
  }
}

export async function findExistingDuplicate(contentHash: string, signal?: AbortSignal): Promise<DuplicateMedia | null> {
  const response = await fetch("/api/admin/media/duplicate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentHash }), signal });
  const result = await response.json() as { duplicate?: DuplicateMedia | null; error?: string };
  if (!response.ok) throw new Error(result.error || "Duplicate lookup failed.");
  return result.duplicate ?? null;
}

export async function resolveDirectDuplicate(ticket: string, choice: "USE_EXISTING" | "UPLOAD_ANYWAY", existingId: string, signal?: AbortSignal) {
  const response = await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket, duplicateChoice: choice, existingId }), signal });
  const result = await response.json() as { item?: UploadedMedia; error?: string };
  if (!response.ok || !result.item) throw new Error(result.error || "Duplicate choice could not be completed.");
  return result.item;
}
