import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { getMediaProvider } from "@/lib/media/provider";
import { validateMediaFile } from "@/lib/media/validation";
import { withProviderRollback } from "@/lib/media/rollback";
import { classifyMediaAspect } from "@/lib/media/management";

export class DuplicateMediaFoundError extends Error {
  constructor(public existingId: string, public contentHash: string) { super("Duplicate media detected."); this.name = "DuplicateMediaFoundError"; }
}

export async function createMediaFromFile(file: { name: string; type: string; size: number; bytes: Uint8Array }, options: { allowDuplicate?: boolean } = {}) {
  const validated = validateMediaFile(file);
  const contentHash = createHash("sha256").update(file.bytes).digest("hex");
  const duplicate = await prisma.media.findFirst({ where: { contentHash }, select: { id: true } });
  if (duplicate && !options.allowDuplicate) throw new DuplicateMediaFoundError(duplicate.id, contentHash);
  const provider = getMediaProvider();
  const stored = await provider.upload({ filename: validated.filename, mimeType: validated.mimeType, fileSize: validated.fileSize, bytes: file.bytes, mediaType: validated.mediaType });
  return withProviderRollback(
    () => prisma.media.create({ data: { filename: validated.filename, originalFilename: validated.originalFilename, mimeType: validated.mimeType, fileSize: validated.fileSize, mediaType: validated.mediaType, storageProvider: "cloudinary", storageKey: stored.storageKey, publicUrl: stored.publicUrl, width: stored.width ?? null, height: stored.height ?? null, duration: stored.duration ?? null, contentHash, aspectClass: classifyMediaAspect(stored.width, stored.height) } }),
    () => provider.delete(stored.storageKey, validated.mediaType),
  );
}
