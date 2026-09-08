import { Prisma, type Project, type ProjectMedia, type Service } from "@prisma/client";

export type ProjectSnapshot = Omit<Project, "publishedSnapshot"> & { media: ProjectMedia[] };
export type ServiceSnapshot = Omit<Service, "publishedSnapshot">;

export function snapshotJson(value: object): Prisma.InputJsonValue {
  const copy = { ...value } as Record<string, unknown>;
  delete copy.publishedSnapshot;
  return JSON.parse(JSON.stringify(copy)) as Prisma.InputJsonValue;
}

export function publishedProject<T extends Project>(record: T): (T & { media?: ProjectMedia[] }) | undefined {
  if (record.status !== "PUBLISHED") return undefined;
  return record.publishedSnapshot ? { ...record, ...record.publishedSnapshot as object, status: "PUBLISHED" } : record;
}

export function publishedService<T extends Service>(record: T): T | undefined {
  if (record.status !== "PUBLISHED") return undefined;
  return record.publishedSnapshot ? { ...record, ...record.publishedSnapshot as object, status: "PUBLISHED" } : record;
}

// Freeze the existing public version before the first draft mutation, including gallery links.
export async function ensureProjectBaseline(tx: Prisma.TransactionClient, id: string) {
  const project = await tx.project.findUniqueOrThrow({ where: { id }, include: { media: { orderBy: { order: "asc" } } } });
  if (project.status === "PUBLISHED" && !project.publishedSnapshot) {
    await tx.project.update({ where: { id }, data: { publishedSnapshot: snapshotJson(project), publishedSlug: project.slug } });
  }
  return project;
}

export async function ensureServiceBaseline(tx: Prisma.TransactionClient, id: string) {
  const service = await tx.service.findUniqueOrThrow({ where: { id } });
  if (service.status === "PUBLISHED" && !service.publishedSnapshot) {
    await tx.service.update({ where: { id }, data: { publishedSnapshot: snapshotJson(service) } });
  }
  return service;
}

export const projectRelations = {
  heroMedia: true, thumbnailMedia: true, beforeMedia: true, afterMedia: true,
  videoMedia: true, videoPosterMedia: true, ogImage: true,
  media: { include: { media: true }, orderBy: { order: "asc" as const } },
} satisfies Prisma.ProjectInclude;

export async function hydrateProject(tx: Prisma.TransactionClient, project: Project & { media?: ProjectMedia[] }) {
  const fields = ["heroMedia", "thumbnailMedia", "beforeMedia", "afterMedia", "videoMedia", "videoPosterMedia", "ogImage"] as const;
  const ids = fields.map((field) => project[`${field}Id`]).filter((id): id is string => !!id);
  const gallery = project.media ?? await tx.projectMedia.findMany({ where: { projectId: project.id }, orderBy: { order: "asc" } });
  const assets = await tx.media.findMany({ where: { id: { in: [...ids, ...gallery.map((item) => item.mediaId)] } } });
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return {
    ...project,
    ...Object.fromEntries(fields.map((field) => [field, byId.get(project[`${field}Id`] ?? "") ?? null])) as Pick<Prisma.ProjectGetPayload<{ include: typeof projectRelations }>, typeof fields[number]>,
    media: gallery.flatMap((item) => { const media = byId.get(item.mediaId); return media ? [{ ...item, media }] : []; }),
  };
}
