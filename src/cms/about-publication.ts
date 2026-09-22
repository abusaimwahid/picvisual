import { Prisma } from "@prisma/client";

export const ABOUT_PUBLISHED_NOTE = "about:published";
export const ABOUT_DRAFT_NOTE = "about:draft";

export type AboutSection = {
  type: string;
  order: number;
  enabled: boolean;
  content: unknown;
  settings?: unknown;
};

export type AboutPageSnapshot = {
  version: 1;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  indexable: boolean;
  ogImageId: string | null;
  sections: AboutSection[];
};

export function readAboutSnapshot(value: unknown): AboutPageSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Partial<AboutPageSnapshot>;
  if (record.version !== 1 || typeof record.title !== "string" || !Array.isArray(record.sections)) return undefined;
  if (!record.sections.every((section) => section && typeof section.type === "string" && Number.isInteger(section.order))) return undefined;
  return record as AboutPageSnapshot;
}

export function publishedAboutSnapshotToPage(snapshot: AboutPageSnapshot) {
  return { title: snapshot.title, seoTitle: snapshot.seoTitle, seoDescription: snapshot.seoDescription, canonicalUrl: snapshot.canonicalUrl, indexable: snapshot.indexable, ogImageId: snapshot.ogImageId, sections: snapshot.sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order).map((section) => ({ type: section.type, content: section.content, order: section.order })) };
}

async function snapshotAbout(tx: Prisma.TransactionClient, pageId: string): Promise<AboutPageSnapshot> {
  const page = await tx.page.findUniqueOrThrow({ where: { id: pageId }, include: { sections: { orderBy: { order: "asc" } } } });
  return {
    version: 1,
    title: page.title,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    canonicalUrl: page.canonicalUrl,
    indexable: page.indexable,
    ogImageId: page.ogImageId,
    sections: page.sections.map(({ type, order, enabled, content, settings }) => ({ type, order, enabled, content, settings })),
  };
}

export async function ensureAboutPublishedBaseline(tx: Prisma.TransactionClient, pageId: string, authorId?: string) {
  const page = await tx.page.findUniqueOrThrow({ where: { id: pageId }, include: { revisions: { where: { note: ABOUT_PUBLISHED_NOTE }, take: 1 } } });
  if (page.status === "PUBLISHED" && !page.revisions.length) {
    await tx.pageRevision.create({ data: { pageId, authorId, note: ABOUT_PUBLISHED_NOTE, snapshot: await snapshotAbout(tx, pageId) as unknown as Prisma.InputJsonValue } });
  }
}

export async function saveAboutDraftRevision(tx: Prisma.TransactionClient, pageId: string, authorId?: string) {
  return tx.pageRevision.create({ data: { pageId, authorId, note: ABOUT_DRAFT_NOTE, snapshot: await snapshotAbout(tx, pageId) as unknown as Prisma.InputJsonValue } });
}

export async function publishAboutRevision(tx: Prisma.TransactionClient, pageId: string, authorId?: string) {
  return tx.pageRevision.create({ data: { pageId, authorId, note: ABOUT_PUBLISHED_NOTE, snapshot: await snapshotAbout(tx, pageId) as unknown as Prisma.InputJsonValue } });
}
