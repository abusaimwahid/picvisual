import { Prisma, type Project, type ProjectMedia, type ProjectStatus } from "@prisma/client";
import { z } from "zod";

export const projectRevisionActions = ["DRAFT_SAVE", "PUBLISH", "RESTORE_TO_DRAFT", "ARCHIVE"] as const;
export type ProjectRevisionAction = typeof projectRevisionActions[number];

const nullableText = z.string().nullable();
const nullableInteger = z.number().int().nullable();
const galleryItemSchema = z.object({
  mediaId: z.string().min(1),
  order: z.number().int().min(0),
  role: z.enum(["GALLERY", "DETAIL", "MOTION_STILL"]),
  layout: z.string().min(1).max(80),
  caption: nullableText,
  alt: nullableText,
});

export const projectRevisionSnapshotSchema = z.object({
  title: z.string(), slug: z.string(), category: z.string(), summary: z.string(), description: nullableText,
  eyebrow: nullableText, intro: nullableText, challenge: nullableText, approach: nullableText,
  productionNotes: nullableText, outcome: nullableText, clientName: nullableText, year: nullableInteger,
  services: z.array(z.string()), featured: z.boolean(), featuredOrder: nullableInteger,
  isCaseStudy: z.boolean(), caseStudyOrder: nullableInteger,
  heroMediaId: nullableText, thumbnailMediaId: nullableText, beforeMediaId: nullableText,
  afterMediaId: nullableText, videoMediaId: nullableText, videoPosterMediaId: nullableText,
  ogImageId: nullableText, seoTitle: nullableText, seoDescription: nullableText,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  media: z.array(galleryItemSchema),
});

export type ProjectRevisionSnapshot = z.infer<typeof projectRevisionSnapshotSchema>;
type SnapshotSource = Project & { media?: ProjectMedia[] };

export function makeProjectRevisionSnapshot(project: SnapshotSource, state: ProjectStatus = project.status): ProjectRevisionSnapshot {
  return structuredClone({
    title: project.title, slug: project.slug, category: project.category, summary: project.summary,
    description: project.description, eyebrow: project.eyebrow, intro: project.intro,
    challenge: project.challenge, approach: project.approach, productionNotes: project.productionNotes,
    outcome: project.outcome, clientName: project.clientName, year: project.year, services: [...project.services],
    featured: project.featured, featuredOrder: project.featuredOrder, isCaseStudy: project.isCaseStudy,
    caseStudyOrder: project.caseStudyOrder, heroMediaId: project.heroMediaId,
    thumbnailMediaId: project.thumbnailMediaId, beforeMediaId: project.beforeMediaId,
    afterMediaId: project.afterMediaId, videoMediaId: project.videoMediaId,
    videoPosterMediaId: project.videoPosterMediaId, ogImageId: project.ogImageId,
    seoTitle: project.seoTitle, seoDescription: project.seoDescription, status: state,
    media: (project.media ?? []).map(({ mediaId, order, role, layout, caption, alt }) => ({ mediaId, order, role, layout: layout || "LANDSCAPE", caption, alt })),
  });
}

export function readProjectRevisionSnapshot(value: unknown) {
  const parsed = projectRevisionSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function projectRevisionMediaIds(snapshot: ProjectRevisionSnapshot) {
  return [...new Set([
    snapshot.heroMediaId, snapshot.thumbnailMediaId, snapshot.beforeMediaId, snapshot.afterMediaId,
    snapshot.videoMediaId, snapshot.videoPosterMediaId, snapshot.ogImageId,
    ...snapshot.media.map((item) => item.mediaId),
  ].filter((id): id is string => Boolean(id)))];
}

export function projectRevisionMediaRequirements(snapshot: ProjectRevisionSnapshot) {
  return [
    ...[snapshot.heroMediaId, snapshot.thumbnailMediaId, snapshot.beforeMediaId, snapshot.afterMediaId, snapshot.videoPosterMediaId, snapshot.ogImageId].filter((id): id is string => Boolean(id)).map((id) => ({ id, type: "IMAGE" as const })),
    ...(snapshot.videoMediaId ? [{ id: snapshot.videoMediaId, type: "VIDEO" as const }] : []),
    ...snapshot.media.map((item) => ({ id: item.mediaId, type: undefined })),
  ];
}

export function projectDraftValues(snapshot: ProjectRevisionSnapshot) {
  const { media: _media, status: _status, ...values } = snapshot;
  return values;
}

export function restoredWorkspaceStatus(current: ProjectStatus): ProjectStatus {
  return current === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

export async function createProjectRevision(
  tx: Prisma.TransactionClient,
  projectId: string,
  authorId: string | undefined,
  action: ProjectRevisionAction,
  publicationState: ProjectStatus,
) {
  const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, include: { media: { orderBy: { order: "asc" } } } });
  const snapshot = makeProjectRevisionSnapshot(project, publicationState);
  return tx.projectRevision.create({ data: { projectId, authorId, action, publicationState, snapshot: snapshot as Prisma.InputJsonValue } });
}

export async function ensureProjectRevisionBaseline(tx: Prisma.TransactionClient, projectId: string, authorId?: string) {
  if (await tx.projectRevision.count({ where: { projectId } })) return;
  const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, include: { media: { orderBy: { order: "asc" } } } });
  if (project.status !== "PUBLISHED") return;
  const published = project.publishedSnapshot && typeof project.publishedSnapshot === "object"
    ? { ...project, ...(project.publishedSnapshot as object) } as typeof project
    : project;
  const snapshot = makeProjectRevisionSnapshot(published, "PUBLISHED");
  await tx.projectRevision.create({ data: { projectId, authorId, action: "PUBLISH", publicationState: "PUBLISHED", snapshot: snapshot as Prisma.InputJsonValue } });
}
