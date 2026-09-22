export type HomepageSection = { type: string; content: unknown };
export type HomepageMedia = Record<string, { mediaType?: string }>;

export type HomepageProjectMode = "empty" | "single" | "multi";

export function homepageProjectMode(projectCount: number): HomepageProjectMode {
  if (projectCount < 1) return "empty";
  return projectCount === 1 ? "single" : "multi";
}

function collectMediaReferences(value: unknown, references: string[] = []) {
  if (!value || typeof value !== "object") return references;
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaReferences(item, references));
    return references;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    if (/MediaId$/.test(key) && typeof child === "string" && child) references.push(child);
    else if (/MediaIds$/.test(key) && Array.isArray(child)) child.forEach((id) => { if (typeof id === "string" && id) references.push(id); });
    else collectMediaReferences(child, references);
  });
  return references;
}

export function resolvedHomepageMediaIds(sections: HomepageSection[] | undefined, media: HomepageMedia) {
  const references = sections?.flatMap((section) => collectMediaReferences(section.content)) ?? [];
  return [...new Set(references)].filter((id) => Boolean(media[id]));
}

export function sectionHasResolvedMedia(section: HomepageSection | undefined, media: HomepageMedia) {
  return Boolean(section && collectMediaReferences(section.content).some((id) => Boolean(media[id])));
}
