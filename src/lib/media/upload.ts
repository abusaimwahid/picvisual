import { prisma } from "@/lib/db/client";
import { getMediaProvider } from "@/lib/media/provider";
import { validateMediaFile } from "@/lib/media/validation";

export async function createMediaFromFile(file: { name: string; type: string; size: number; bytes: Uint8Array }) {
  const validated = validateMediaFile(file);
  const provider = getMediaProvider();
  const stored = await provider.upload({ filename: validated.filename, mimeType: validated.mimeType, fileSize: validated.fileSize, bytes: file.bytes, mediaType: validated.mediaType });
  try {
    return await prisma.media.create({ data: { filename: validated.filename, originalFilename: validated.originalFilename, mimeType: validated.mimeType, fileSize: validated.fileSize, mediaType: validated.mediaType, storageProvider: "cloudinary", storageKey: stored.storageKey, publicUrl: stored.publicUrl, width: stored.width ?? null, height: stored.height ?? null, duration: stored.duration ?? null } });
  } catch (error) {
    await provider.delete(stored.storageKey, validated.mediaType).catch(() => undefined);
    throw error;
  }
}
