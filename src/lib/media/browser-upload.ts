import { validateMediaFile } from "./validation";
import type { PickerMedia } from "@/components/admin/MediaPicker";
export async function uploadBrowserFile(file: File): Promise<PickerMedia> {
  validateMediaFile({ name: file.name, type: file.type, size: file.size, bytes: new Uint8Array(await file.slice(0, file.type === "image/svg+xml" ? file.size : 65536).arrayBuffer()) });
  const response = await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, mimeType: file.type, fileSize: file.size }) });
  const signed = await response.json(); if (!response.ok) throw new Error(signed.error || "Could not start upload.");
  const form = new FormData(); Object.entries(signed.parameters as Record<string, string>).forEach(([key, value]) => form.set(key, value)); form.set("file", file);
  const upload = await fetch(signed.url, { method: "POST", body: form }); if (!upload.ok) throw new Error("Storage upload failed. Please try again.");
  const final = await fetch("/api/admin/media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: signed.ticket }) });
  const result = await final.json(); if (!final.ok || !result.item) throw new Error(result.error || "Upload verification failed.");
  return result.item;
}
