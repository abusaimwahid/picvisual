export type MediaUploadInput = { filename: string; mimeType: string; fileSize: number; bytes: Uint8Array; mediaType: "IMAGE" | "VIDEO" };
export type StoredMedia = { storageKey: string; publicUrl: string; width?: number; height?: number; duration?: number };
export interface MediaProvider { upload(input: MediaUploadInput): Promise<StoredMedia>; delete(storageKey: string, mediaType?: "IMAGE" | "VIDEO"): Promise<void>; }
