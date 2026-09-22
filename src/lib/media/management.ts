import type { Prisma } from "@prisma/client";

export const MEDIA_PAGE_SIZES = [24, 48, 96] as const;
export type MediaSort = "newest" | "oldest" | "name-asc" | "name-desc" | "largest" | "smallest";
export type MediaTypeFilter = "ALL" | "IMAGE" | "VIDEO" | "SVG";
export type MediaUsageFilter = "ALL" | "USED" | "UNUSED";
export type MediaAspectFilter = "ALL" | "LANDSCAPE" | "PORTRAIT" | "SQUARE";
export const MEDIA_SQUARE_TOLERANCE = 0.05;

export function classifyMediaAspect(width: number | null | undefined, height: number | null | undefined): Exclude<MediaAspectFilter, "ALL"> | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  if (Math.abs(width - height) / Math.max(width, height) <= MEDIA_SQUARE_TOLERANCE) return "SQUARE";
  return width > height ? "LANDSCAPE" : "PORTRAIT";
}

export function normalizeMediaPageSize(value: unknown) {
  const parsed = Number(value);
  return MEDIA_PAGE_SIZES.includes(parsed as (typeof MEDIA_PAGE_SIZES)[number]) ? parsed : 24;
}

export function mediaSortOrder(sort: MediaSort) {
  if (sort === "oldest") return [{ createdAt: "asc" as const }, { id: "asc" as const }];
  if (sort === "name-asc") return [{ filename: "asc" as const }, { id: "asc" as const }];
  if (sort === "name-desc") return [{ filename: "desc" as const }, { id: "desc" as const }];
  if (sort === "largest") return [{ fileSize: "desc" as const }, { id: "desc" as const }];
  if (sort === "smallest") return [{ fileSize: "asc" as const }, { id: "asc" as const }];
  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

export function updatePageSelection(selectedIds: string[], pageIds: string[], clickedId: string, anchorId: string | null, shiftKey: boolean) {
  const selected = new Set(selectedIds);
  if (shiftKey && anchorId && pageIds.includes(anchorId) && pageIds.includes(clickedId)) {
    const start = pageIds.indexOf(anchorId), end = pageIds.indexOf(clickedId);
    pageIds.slice(Math.min(start, end), Math.max(start, end) + 1).forEach((id) => selected.add(id));
  } else if (selected.has(clickedId)) selected.delete(clickedId);
  else selected.add(clickedId);
  return { selectedIds: pageIds.filter((id) => selected.has(id)), anchorId: clickedId };
}

export function classifyBulkDelete(items: Array<{ id: string; referenceCount: number }>) {
  return {
    safeIds: items.filter((item) => item.referenceCount === 0).map((item) => item.id),
    protectedIds: items.filter((item) => item.referenceCount > 0).map((item) => item.id),
  };
}

export function buildMediaWhere({ query, type, usage, collectionId, tagId, aspect, serializedIds }: { query: string; type: MediaTypeFilter; usage: MediaUsageFilter; collectionId?: string; tagId?: string; aspect?: MediaAspectFilter; serializedIds: string[] }) {
  const references: Prisma.MediaWhereInput = { OR: [
    { id: { in: serializedIds } },
    { pageOgImages: { some: {} } }, { projectHeroes: { some: {} } }, { projectThumbnails: { some: {} } },
    { projectBefore: { some: {} } }, { projectAfter: { some: {} } }, { projectVideos: { some: {} } },
    { projectVideoPosters: { some: {} } }, { projectOgImages: { some: {} } }, { projectMedia: { some: {} } },
    { serviceHeroes: { some: {} } }, { serviceThumbnails: { some: {} } }, { serviceOgImages: { some: {} } },
    { testimonialMedia: { some: {} } }, { clientLogos: { some: {} } }, { settingLogo: { some: {} } },
    { videoPosters: { some: {} } },
  ] };
  const and: Prisma.MediaWhereInput[] = [];
  if (type === "IMAGE") and.push({ mediaType: "IMAGE", mimeType: { not: "image/svg+xml" } });
  if (type === "VIDEO") and.push({ mediaType: "VIDEO" });
  if (type === "SVG") and.push({ mimeType: "image/svg+xml" });
  if (collectionId) and.push({ collections: { some: { collectionId } } });
  if (tagId) and.push({ tags: { some: { tagId } } });
  if (aspect && aspect !== "ALL") and.push({ aspectClass: aspect });
  if (usage === "USED") and.push(references);
  if (usage === "UNUSED") and.push({ NOT: references });
  if (query) and.push({ OR: [
    { filename: { contains: query, mode: "insensitive" } }, { alt: { contains: query, mode: "insensitive" } },
    { caption: { contains: query, mode: "insensitive" } },
    { collections: { some: { collection: { name: { contains: query, mode: "insensitive" } } } } },
    { tags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } },
  ] });
  return and.length ? { AND: and } satisfies Prisma.MediaWhereInput : {};
}

export type BulkDeleteCandidate = { id: string; filename: string; referenceCount: number };
export type BulkDeleteOutcome = BulkDeleteCandidate & { status: "deleted" | "protected" | "failed"; message: string };

export async function processBulkDelete(
  candidates: BulkDeleteCandidate[],
  verifyReferenceCount: (id: string) => Promise<number | null>,
  deleteSafeAsset: (id: string) => Promise<void>,
) {
  const outcomes: BulkDeleteOutcome[] = [];
  for (const candidate of candidates) {
    if (candidate.referenceCount > 0) {
      outcomes.push({ ...candidate, status: "protected", message: `${candidate.referenceCount} current usage location${candidate.referenceCount === 1 ? "" : "s"}` });
      continue;
    }
    try {
      const authoritativeCount = await verifyReferenceCount(candidate.id);
      if (authoritativeCount === null) {
        outcomes.push({ ...candidate, status: "failed", message: "Media record was not found" });
      } else if (authoritativeCount > 0) {
        outcomes.push({ ...candidate, referenceCount: authoritativeCount, status: "protected", message: `Usage changed before deletion (${authoritativeCount} location${authoritativeCount === 1 ? "" : "s"})` });
      } else {
        await deleteSafeAsset(candidate.id);
        outcomes.push({ ...candidate, status: "deleted", message: "Provider asset and Media record deleted" });
      }
    } catch {
      outcomes.push({ ...candidate, status: "failed", message: "Provider or database deletion failed; review this asset" });
    }
  }
  return outcomes;
}
