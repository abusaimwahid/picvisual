import { prisma } from "@/lib/db/client";

export type MediaUsage = { label: string; count: number };

export function summarizeMediaUsage(counts: Record<string, number>): MediaUsage[] { return Object.entries(counts).filter(([, count]) => count > 0).map(([label, count]) => ({ label, count })); }

export async function getMediaUsage(mediaId: string) {
  const [media, sections, revisions, projects, services, settings] = await Promise.all([
    prisma.media.findUnique({ where: { id: mediaId }, include: { projectHeroes: true, projectThumbnails: true, projectBefore: true, projectAfter: true, projectVideos: true, projectVideoPosters: true, projectOgImages: true, projectMedia: true, serviceHeroes: true, serviceThumbnails: true, serviceOgImages: true, testimonialMedia: true, clientLogos: true, settingLogo: true, pageOgImages: true, videoPosters: true } }),
    prisma.pageSection.findMany({ select: { id: true, type: true, content: true } }),
    prisma.pageRevision.findMany({ select: { snapshot: true } }),
    prisma.project.findMany({ where: { publishedSnapshot: { not: undefined } }, select: { publishedSnapshot: true } }),
    prisma.service.findMany({ select: { publishedSnapshot: true } }),
    prisma.siteSetting.findMany({ select: { value: true } }),
  ]);
  if (!media) return undefined;
  const homepageSections = sections.filter((section) => JSON.stringify(section.content).includes(mediaId));
  const usage = summarizeMediaUsage({ "Published versions / revision history": [...revisions, ...projects, ...services, ...settings].filter((item) => JSON.stringify(item).includes(mediaId)).length, "Project hero": media.projectHeroes.length, "Project thumbnail": media.projectThumbnails.length, "Project before": media.projectBefore.length, "Project after": media.projectAfter.length, "Project video": media.projectVideos.length, "Project video poster": media.projectVideoPosters.length, "Project Open Graph": media.projectOgImages.length, "Project gallery": media.projectMedia.length, "Service hero": media.serviceHeroes.length, "Service thumbnail": media.serviceThumbnails.length, "Service Open Graph": media.serviceOgImages.length, Testimonials: media.testimonialMedia.length, Clients: media.clientLogos.length, Branding: media.settingLogo.length, "Page Open Graph": media.pageOgImages.length, "Video poster": media.videoPosters.length, "Homepage/page sections": homepageSections.length });
  return { media, usage, referenceCount: usage.reduce((sum, item) => sum + item.count, 0) };
}
