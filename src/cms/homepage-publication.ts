import { Prisma, type PrismaClient } from "@prisma/client";
import { hasAllowedMediaKinds, sectionMediaRequirements } from "@/cms/homepage-editor";
import { sectionSchemas, validateSection, type SectionType } from "@/cms/types/sections";

export const HOMEPAGE_DRAFT_NOTE = "homepage:draft";
export const HOMEPAGE_PUBLISHED_NOTE = "homepage:published";

export type HomepageSnapshot = {
  version: 1;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Array<{ type: string; order: number; enabled: boolean; theme: string | null; content: unknown; settings: unknown }>;
};

type HomepageDb = PrismaClient | Prisma.TransactionClient;
type PageWithSections = { id: string; title: string; seoTitle: string | null; seoDescription: string | null; sections: Array<{ type: string; order: number; enabled: boolean; theme: string | null; content: unknown; settings: unknown }> };

export function makeHomepageSnapshot(page: PageWithSections): HomepageSnapshot {
  return { version: 1, title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription, sections: [...page.sections].sort((a, b) => a.order - b.order).map((section) => ({ ...section })) };
}

export function readHomepageSnapshot(value: unknown): HomepageSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const snapshot = value as Partial<HomepageSnapshot>;
  if (snapshot.version !== 1 || typeof snapshot.title !== "string" || !Array.isArray(snapshot.sections)) return undefined;
  return snapshot as HomepageSnapshot;
}

async function pageWithSections(db: HomepageDb, pageId: string) {
  return db.page.findUnique({ where: { id: pageId }, include: { sections: { orderBy: { order: "asc" } } } });
}

/** Locks the current approved state into history before the first draft mutation. */
export async function ensureHomepagePublishedBaseline(db: HomepageDb, pageId: string, actorId?: string) {
  const published = await db.pageRevision.findFirst({ where: { pageId, note: HOMEPAGE_PUBLISHED_NOTE }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (published) return;
  const page = await pageWithSections(db, pageId);
  if (!page) throw new Error("Homepage is not available.");
  await db.pageRevision.create({ data: { pageId, authorId: actorId, snapshot: makeHomepageSnapshot(page) as Prisma.InputJsonValue, note: HOMEPAGE_PUBLISHED_NOTE } });
}

export async function saveHomepageDraftSnapshot(db: HomepageDb, pageId: string, actorId?: string) {
  const page = await pageWithSections(db, pageId);
  if (!page) throw new Error("Homepage is not available.");
  return db.pageRevision.create({ data: { pageId, authorId: actorId, snapshot: makeHomepageSnapshot(page) as Prisma.InputJsonValue, note: HOMEPAGE_DRAFT_NOTE } });
}

export async function latestHomepageRevision(db: HomepageDb, pageId: string, note: typeof HOMEPAGE_DRAFT_NOTE | typeof HOMEPAGE_PUBLISHED_NOTE) {
  return db.pageRevision.findFirst({ where: { pageId, note }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, email: true } } } });
}

export async function validateHomepageSnapshot(db: HomepageDb, snapshot: HomepageSnapshot): Promise<string | undefined> {
  const sections = snapshot.sections;
  if (!sections.length) return "The homepage has no sections.";
  const orders = sections.map((section) => section.order).sort((a, b) => a - b);
  if (orders.some((order, index) => order !== index)) return "Homepage section order is invalid.";
  const required = ["hero", "positioning", "cta"];
  if (required.some((type) => !sections.some((section) => section.type === type && section.enabled))) return "Hero, positioning, and call-to-action sections must remain visible.";
  if (sections.find((section) => section.type === "hero")?.order !== 0 || sections.find((section) => section.type === "cta")?.order !== sections.length - 1) return "Hero must be first and the call-to-action must be last.";
  for (const section of sections) {
    if (!(section.type in sectionSchemas)) return `Unknown section type: ${section.type}.`;
    try { validateSection(section.type as SectionType, section.content); } catch { return `The ${section.type} section has invalid content.`; }
  }
  const media = sections.flatMap((section) => sectionMediaRequirements(section.type as SectionType, section.content as Record<string, unknown>));
  if (media.length) {
    const records = await db.media.findMany({ where: { id: { in: [...new Set(media.map((item) => item.id))] } }, select: { id: true, mediaType: true } });
    if (!hasAllowedMediaKinds(media, records)) return "One or more selected media assets are missing or have the wrong media type.";
  }
  const selectedProjects = sections.flatMap((section) => section.type === "selectedWork" ? ((section.content as { projectIds?: string[] }).projectIds ?? []) : []);
  if (selectedProjects.length && await db.project.count({ where: { id: { in: selectedProjects }, status: "PUBLISHED" } }) !== new Set(selectedProjects).size) return "Selected work includes a missing, draft, or archived project.";
  const selectedServices = sections.flatMap((section) => section.type === "capabilities" ? ((section.content as { serviceIds?: string[] }).serviceIds ?? []) : []);
  if (selectedServices.length && await db.service.count({ where: { id: { in: selectedServices }, status: "PUBLISHED" } }) !== new Set(selectedServices).size) return "Capabilities includes a missing, draft, or archived service.";
  const selectedFaqs = sections.flatMap((section) => section.type === "faq" && (section.content as { displayMode?: string }).displayMode === "SELECTED" ? ((section.content as { faqIds?: string[] }).faqIds ?? []) : []);
  if (selectedFaqs.length && await db.fAQ.count({ where: { id: { in: selectedFaqs }, enabled: true } }) !== new Set(selectedFaqs).size) return "FAQ includes a missing or disabled question.";
  return undefined;
}

export function publishedSnapshotToPage(snapshot: HomepageSnapshot) {
  return { title: snapshot.title, seoTitle: snapshot.seoTitle, seoDescription: snapshot.seoDescription, sections: snapshot.sections.filter((section) => section.enabled).map((section) => ({ type: section.type, content: section.content, order: section.order })) };
}
