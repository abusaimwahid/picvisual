import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export type MediaUsage = { label: string; count: number; locations?: string[] };

export function summarizeMediaUsage(counts: Record<string, number>): MediaUsage[] {
  return Object.entries(counts).filter(([, count]) => count > 0).map(([label, count]) => ({ label, count }));
}

const containsId = (value: unknown, mediaId: string) => JSON.stringify(value).includes(mediaId);
const unique = (values: string[]) => [...new Set(values)];

async function serializedReferenceSources() {
  const [sections, pageRevisions, projectRevisions, projects, services, settings] = await Promise.all([
    prisma.pageSection.findMany({ select: { type: true, content: true, page: { select: { title: true } } } }),
    prisma.pageRevision.findMany({ select: { snapshot: true, page: { select: { title: true } } } }),
    prisma.projectRevision.findMany({ select: { snapshot: true, project: { select: { title: true } } } }),
    prisma.project.findMany({ select: { title: true, publishedSnapshot: true } }),
    prisma.service.findMany({ select: { title: true, publishedSnapshot: true } }),
    prisma.siteSetting.findMany({ select: { key: true, value: true } }),
  ]);
  return { sections, pageRevisions, projectRevisions, projects, services, settings };
}

function collectCandidateIds(value: unknown, output: Set<string>) {
  if (typeof value === "string") {
    if (/^c[a-z0-9]{20,}$/i.test(value)) output.add(value);
    return;
  }
  if (Array.isArray(value)) { value.forEach((item) => collectCandidateIds(item, output)); return; }
  if (value && typeof value === "object") Object.values(value).forEach((item) => collectCandidateIds(item, output));
}

export async function findSerializedMediaReferenceIds() {
  const sources = await serializedReferenceSources();
  const ids = new Set<string>();
  [sources.sections, sources.pageRevisions, sources.projectRevisions, sources.projects, sources.services, sources.settings].forEach((group) => group.forEach((source) => collectCandidateIds(source, ids)));
  return [...ids];
}

export function mediaReferenceWhere(serializedIds: string[]): Prisma.MediaWhereInput {
  return { OR: [
    { id: { in: serializedIds } },
    { pageOgImages: { some: {} } }, { projectHeroes: { some: {} } }, { projectThumbnails: { some: {} } },
    { projectBefore: { some: {} } }, { projectAfter: { some: {} } }, { projectVideos: { some: {} } },
    { projectVideoPosters: { some: {} } }, { projectOgImages: { some: {} } }, { projectMedia: { some: {} } },
    { serviceHeroes: { some: {} } }, { serviceThumbnails: { some: {} } }, { serviceOgImages: { some: {} } },
    { testimonialMedia: { some: {} } }, { clientLogos: { some: {} } }, { settingLogo: { some: {} } },
    { videoPosters: { some: {} } },
  ] };
}

type UsageMedia = {
  id: string; filename: string; storageKey: string; mediaType: "IMAGE" | "VIDEO";
  pageOgImages: Array<{ title: string }>;
  projectHeroes: Array<{ title: string }>; projectThumbnails: Array<{ title: string }>;
  projectBefore: Array<{ title: string }>; projectAfter: Array<{ title: string }>;
  projectVideos: Array<{ title: string }>; projectVideoPosters: Array<{ title: string }>;
  projectOgImages: Array<{ title: string }>; projectMedia: Array<{ role: string; project: { title: string } }>;
  serviceHeroes: Array<{ title: string }>; serviceThumbnails: Array<{ title: string }>; serviceOgImages: Array<{ title: string }>;
  testimonialMedia: Array<{ person: string | null; company: string | null }>;
  clientLogos: Array<{ name: string }>; settingLogo: Array<{ key: string }>; videoPosters: Array<{ filename: string }>;
};

function buildUsage(item: UsageMedia, sources: Awaited<ReturnType<typeof serializedReferenceSources>>) {
  const mediaId = item.id;
  const groups: Array<[string, string[]]> = [
    ["Project hero", item.projectHeroes.map((value) => `Project — ${value.title} Hero`)],
    ["Project thumbnail", item.projectThumbnails.map((value) => `Project — ${value.title} Thumbnail`)],
    ["Project before", item.projectBefore.map((value) => `Project — ${value.title} Before`)],
    ["Project after", item.projectAfter.map((value) => `Project — ${value.title} After`)],
    ["Project video", item.projectVideos.map((value) => `Project — ${value.title} Video`)],
    ["Project video poster", item.projectVideoPosters.map((value) => `Project — ${value.title} Video poster`)],
    ["Project Open Graph", item.projectOgImages.map((value) => `Project — ${value.title} Open Graph`)],
    ["Project gallery", item.projectMedia.map((value) => `Project — ${value.project.title} ${value.role.toLowerCase()}`)],
    ["Service hero", item.serviceHeroes.map((value) => `Service — ${value.title} Hero`)],
    ["Service thumbnail", item.serviceThumbnails.map((value) => `Service — ${value.title} Thumbnail`)],
    ["Service Open Graph", item.serviceOgImages.map((value) => `Service — ${value.title} Open Graph`)],
    ["Testimonials", item.testimonialMedia.map((value) => `Testimonial — ${value.person || value.company || "Unnamed"}`)],
    ["Clients", item.clientLogos.map((value) => `Client — ${value.name}`)],
    ["Branding", item.settingLogo.map((value) => `Branding — ${value.key}`)],
    ["Page Open Graph", item.pageOgImages.map((value) => `Page — ${value.title} Open Graph`)],
    ["Video poster", item.videoPosters.map((value) => `Video poster — ${value.filename}`)],
    ["Homepage/page sections", sources.sections.filter((value) => containsId(value.content, mediaId)).map((value) => `Page — ${value.page.title} / ${value.type}`)],
    ["Published versions / page history", [
      ...sources.pageRevisions.filter((value) => containsId(value.snapshot, mediaId)).map((value) => `Page history — ${value.page.title}`),
      ...sources.projects.filter((value) => containsId(value.publishedSnapshot, mediaId)).map((value) => `Published project — ${value.title}`),
      ...sources.services.filter((value) => containsId(value.publishedSnapshot, mediaId)).map((value) => `Published service — ${value.title}`),
      ...sources.settings.filter((value) => containsId(value.value, mediaId)).map((value) => `Setting — ${value.key}`),
    ]],
    ["Project history", sources.projectRevisions.filter((value) => containsId(value.snapshot, mediaId)).map((value) => `Project history — ${value.project.title}`)],
  ];
  const usage = groups.map(([label, locations]) => ({ label, locations: unique(locations), count: unique(locations).length })).filter((value) => value.count > 0);
  const historicalReferenceCount = sources.projectRevisions.filter((value) => containsId(value.snapshot, mediaId)).length;
  return { media: item, usage, historicalReferenceCount, referenceCount: usage.reduce((sum, value) => sum + value.count, 0) };
}

export async function getMediaUsageBatch(mediaIds: string[]) {
  if (!mediaIds.length) return new Map<string, ReturnType<typeof buildUsage>>();
  const [media, sources] = await Promise.all([
    prisma.media.findMany({ where: { id: { in: mediaIds } }, select: {
      id: true, filename: true, storageKey: true, mediaType: true,
      pageOgImages: { select: { title: true } }, projectHeroes: { select: { title: true } }, projectThumbnails: { select: { title: true } },
      projectBefore: { select: { title: true } }, projectAfter: { select: { title: true } }, projectVideos: { select: { title: true } },
      projectVideoPosters: { select: { title: true } }, projectOgImages: { select: { title: true } },
      projectMedia: { select: { role: true, project: { select: { title: true } } } },
      serviceHeroes: { select: { title: true } }, serviceThumbnails: { select: { title: true } }, serviceOgImages: { select: { title: true } },
      testimonialMedia: { select: { person: true, company: true } }, clientLogos: { select: { name: true } }, settingLogo: { select: { key: true } },
      videoPosters: { select: { filename: true } },
    } }),
    serializedReferenceSources(),
  ]);
  return new Map(media.map((item) => [item.id, buildUsage(item, sources)]));
}

export async function getMediaUsage(mediaId: string) {
  return (await getMediaUsageBatch([mediaId])).get(mediaId);
}
