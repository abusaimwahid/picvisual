import type { Project as PublicProject, PublicAsset } from "@/content/work";
import type { Service as PublicService } from "@/content/services";
import type { Project, Service } from "@prisma/client";

type ProjectAssets = Partial<Record<"thumbnailMedia" | "heroMedia" | "beforeMedia" | "afterMedia" | "videoMedia" | "videoPosterMedia" | "ogImage", PublicAsset | null>> & { media?: Array<{ caption: string | null; alt: string | null; role?: string; media: PublicAsset & { mediaType: "IMAGE" | "VIDEO" } }> };
export function mapProjectToPublicProject(project: Project & ProjectAssets, index = 0): PublicProject {
  return { id: project.id, slug: project.slug, title: project.title, category: project.category, scope: project.services[0] ?? "Selected imagery", summary: project.summary, description: project.description, clientName: project.clientName, year: project.year, seoTitle: project.seoTitle, seoDescription: project.seoDescription, featured: project.featured, featuredOrder: project.featuredOrder, services: project.services, tone: "sky", size: index % 3 === 1 ? "portrait" : "wide", thumbnail: project.thumbnailMedia ?? project.heroMedia ?? undefined, hero: project.heroMedia ?? project.thumbnailMedia ?? undefined, before: project.beforeMedia ?? undefined, after: project.afterMedia ?? undefined, video: project.videoMedia ?? undefined, poster: project.videoPosterMedia ?? undefined, ogImage: project.ogImage ?? undefined, gallery: project.media?.map((item) => ({ ...item.media, alt: item.alt ?? item.media.alt, caption: item.caption, role: item.role })) };
}
export function mapServiceToPublicService(service: Service & { heroMedia?: PublicAsset | null; thumbnailMedia?: PublicAsset | null }, index: number): PublicService {
  return { id: service.id, slug: service.slug, featured: service.featured, title: service.title, shortTitle: service.category, description: service.shortDescription, items: service.description?.split("\n").filter(Boolean) ?? [], index: String(index + 1).padStart(2, "0"), hero: service.heroMedia ?? service.thumbnailMedia ?? undefined, seoTitle: service.seoTitle, seoDescription: service.seoDescription };
}
