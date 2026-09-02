export type MediaUploadInput = { filename: string; mimeType: string; fileSize: number; bytes: Uint8Array };
export type StoredMedia = { storageKey: string; publicUrl: string };
export interface MediaProvider { upload(input: MediaUploadInput): Promise<StoredMedia>; delete(storageKey: string): Promise<void>; }
