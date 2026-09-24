import type { SectionType } from "@/cms/types/sections";

export type MediaKind = "IMAGE" | "VIDEO";

const imageFields = new Set([
  "primaryMediaId", "secondaryMediaId", "tertiaryMediaId", "mobileMediaId", "posterMediaId",
  "rawMediaId", "finishedMediaId", "detailMediaIds", "finalFrameMediaId", "sourceMediaId",
  "cutoutMediaId", "shadowMediaId", "finalMediaId", "campaignMediaId", "macroMediaId",
  "supportingMediaId", "backgroundMediaId", "subjectMediaId", "lightMediaId", "textureMediaId",
  "interfaceMediaId", "fragmentMediaId", "screenshotMediaId", "beforeMediaId", "afterMediaId",
  "detailMediaId", "posterMediaIds",
]);
const videoFields = new Set(["videoMediaId", "mobileVideoMediaId", "reelMediaIds"]);
/** `mediaId` is IMAGE or VIDEO depending on section type. */
const videoMediaIdTypes = new Set<SectionType>(["video", "motionShowcase"]);

export function sectionMediaRequirements(type: SectionType, content: Record<string, unknown>): Array<{ id: string; kind: MediaKind }> {
  const entries: Array<{ id: string; kind: MediaKind }> = [];
  for (const [field, raw] of Object.entries(content)) {
    let kind: MediaKind | undefined;
    if (videoFields.has(field)) kind = "VIDEO";
    else if (field === "mediaId") kind = videoMediaIdTypes.has(type) ? "VIDEO" : "IMAGE";
    else if (imageFields.has(field)) kind = "IMAGE";
    if (!kind) continue;
    for (const id of Array.isArray(raw) ? raw : [raw]) {
      if (typeof id === "string" && id) entries.push({ id, kind });
    }
  }
  return entries;
}

export function hasAllowedMediaKinds(requirements: Array<{ id: string; kind: MediaKind }>, media: Array<{ id: string; mediaType: MediaKind }>) {
  const mediaById = new Map(media.map((entry) => [entry.id, entry.mediaType]));
  return requirements.every((requirement) => mediaById.get(requirement.id) === requirement.kind);
}

export const protectedHomepageSectionTypes = new Set(["hero", "positioning", "cta"]);
