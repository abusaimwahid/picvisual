export const MEDIA_UPLOAD_CONCURRENCY = 3;
export const DIRECT_UPLOAD_CHUNK_THRESHOLD = 100 * 1024 * 1024;
export const DIRECT_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

export type UploadStatus = "QUEUED" | "VALIDATING" | "UPLOADING" | "FINALIZING" | "DUPLICATE" | "COMPLETE" | "FAILED" | "CANCELED";

export type UploadProgressRecord = {
  id: string;
  size: number;
  uploadedBytes: number;
  status: UploadStatus;
};

export function clampUploadedBytes(item: UploadProgressRecord) {
  if (item.status === "COMPLETE" || item.status === "FINALIZING") return item.size;
  if (item.status === "QUEUED" || item.status === "VALIDATING" || item.status === "DUPLICATE" || item.status === "FAILED" || item.status === "CANCELED") return Math.max(0, Math.min(item.size, item.uploadedBytes));
  return Math.max(0, Math.min(item.size, item.uploadedBytes));
}

export function overallUploadProgress(items: UploadProgressRecord[]) {
  const totalBytes = items.reduce((sum, item) => sum + Math.max(0, item.size), 0);
  const uploadedBytes = items.reduce((sum, item) => sum + clampUploadedBytes(item), 0);
  return { totalBytes, uploadedBytes, percent: totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 0 };
}

export function uploadSummary(items: UploadProgressRecord[]) {
  const count = (status: UploadStatus) => items.filter((item) => item.status === status).length;
  return {
    total: items.length,
    queued: count("QUEUED") + count("VALIDATING"),
    uploading: count("UPLOADING") + count("FINALIZING"),
    complete: count("COMPLETE"),
    failed: count("FAILED"),
    duplicate: count("DUPLICATE"),
    canceled: count("CANCELED"),
  };
}

export function nextQueuedIds(items: UploadProgressRecord[], activeIds: ReadonlySet<string>, concurrency = MEDIA_UPLOAD_CONCURRENCY) {
  const slots = Math.max(0, concurrency - activeIds.size);
  return items.filter((item) => item.status === "QUEUED" && !activeIds.has(item.id)).slice(0, slots).map((item) => item.id);
}

export function retryFailed<T extends UploadProgressRecord>(item: T): T {
  return item.status === "FAILED" ? { ...item, status: "QUEUED", uploadedBytes: 0 } : item;
}

export function cancelQueued<T extends UploadProgressRecord>(item: T): T {
  return item.status === "QUEUED" || item.status === "VALIDATING" ? { ...item, status: "CANCELED", uploadedBytes: 0 } : item;
}

export function humanFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export function fileQueueIdentity(file: Pick<File, "name" | "size" | "type" | "lastModified">) {
  return `${file.name}\u0000${file.size}\u0000${file.type}\u0000${file.lastModified}`;
}

export function reserveBatchContentHash(owners: Map<string, string>, contentHash: string, queueId: string) {
  const duplicateOf = owners.get(contentHash);
  if (duplicateOf && duplicateOf !== queueId) return { duplicateOf };
  owners.set(contentHash, queueId);
  return { duplicateOf: null };
}

export function cloudUploadParts(fileSize: number) {
  if (!Number.isFinite(fileSize) || fileSize < 0) throw new Error("File size must be a non-negative finite number.");
  if (fileSize <= DIRECT_UPLOAD_CHUNK_THRESHOLD) return [{ start: 0, end: fileSize }];
  const parts: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < fileSize; start += DIRECT_UPLOAD_CHUNK_SIZE) {
    parts.push({ start, end: Math.min(fileSize, start + DIRECT_UPLOAD_CHUNK_SIZE) });
  }
  return parts;
}
