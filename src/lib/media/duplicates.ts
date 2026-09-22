import { prisma } from "@/lib/db/client";
import { getMediaUsage } from "@/lib/media/usage";

export type DuplicateMediaDetails = {
  id: string;
  filename: string;
  publicUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  usageCount: number;
};

const duplicateSelect = { id: true, filename: true, publicUrl: true, mediaType: true, alt: true, caption: true, width: true, height: true, createdAt: true } as const;

export async function duplicateDetailsById(id: string): Promise<DuplicateMediaDetails | null> {
  const item = await prisma.media.findUnique({ where: { id }, select: duplicateSelect });
  if (!item) return null;
  const usage = await getMediaUsage(item.id);
  return { ...item, createdAt: item.createdAt.toISOString(), usageCount: usage?.referenceCount ?? 0 };
}

export async function findExactDuplicate(contentHash: string, excludeId?: string) {
  const item = await prisma.media.findFirst({ where: { contentHash, ...(excludeId ? { id: { not: excludeId } } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: duplicateSelect });
  return item ? duplicateDetailsById(item.id) : null;
}
