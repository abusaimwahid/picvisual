import { unstable_cache } from "next/cache";
import { faqs as fallbackFaqs } from "@/content/faq";
import { services as fallbackServices, type Service as PublicService } from "@/content/services";
import { projects as fallbackProjects, type Project as PublicProject } from "@/content/work";
import { site as fallbackSite } from "@/content/site";
import { mapProjectToPublicProject, mapServiceToPublicService } from "@/lib/adapters/public-content";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export type ReaderResult<T> = { source: "cms" | "fallback"; data: T };
export type PublicNavigationItem = { label: string; href: string };
export type PublicPageContent = { title: string; seoTitle?: string | null; seoDescription?: string | null; sections: Array<{ type: string; content: unknown; order: number }> };

const fallbackSettings: { name: string; email: string; description: string } = { name: fallbackSite.name, email: fallbackSite.email, description: fallbackSite.description };
const safeHref = (href: string) => href.startsWith("/") || /^https:\/\//i.test(href);

export const getPublicProjects = unstable_cache(async (): Promise<ReaderResult<PublicProject[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackProjects };
  try { const projects = await prisma.project.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { featuredOrder: "asc" }, { updatedAt: "desc" }] }); return projects.length ? { source: "cms", data: projects.map(mapProjectToPublicProject) } : { source: "fallback", data: fallbackProjects }; } catch { return { source: "fallback", data: fallbackProjects }; }
}, ["public-projects-reader"], { tags: ["public-projects"] });

export async function getPublicProjectBySlug(slug: string): Promise<ReaderResult<PublicProject | undefined>> {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackProjects.find((project) => project.slug === slug) };
  try { const project = await prisma.project.findFirst({ where: { slug, status: "PUBLISHED" } }); return project ? { source: "cms", data: mapProjectToPublicProject(project) } : { source: "fallback", data: fallbackProjects.find((item) => item.slug === slug) }; } catch { return { source: "fallback", data: fallbackProjects.find((project) => project.slug === slug) }; }
}

export const getPublicServices = unstable_cache(async (): Promise<ReaderResult<PublicService[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackServices };
  try { const services = await prisma.service.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featuredOrder: "asc" }, { updatedAt: "asc" }] }); return services.length ? { source: "cms", data: services.map(mapServiceToPublicService) } : { source: "fallback", data: fallbackServices }; } catch { return { source: "fallback", data: fallbackServices }; }
}, ["public-services-reader"], { tags: ["public-services"] });

export async function getPublicServiceBySlug(slug: string) { const all = await getPublicServices(); return { ...all, data: all.data.find((service) => service.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slug) }; }

export const getPublicFaq = unstable_cache(async (): Promise<ReaderResult<[string, string][]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackFaqs as [string, string][] };
  try { const faq = await prisma.fAQ.findMany({ where: { enabled: true, pageKey: "home" }, orderBy: { order: "asc" } }); return faq.length ? { source: "cms", data: faq.map((item) => [item.question, item.answer]) } : { source: "fallback", data: fallbackFaqs as [string, string][] }; } catch { return { source: "fallback", data: fallbackFaqs as [string, string][] }; }
}, ["public-faq-reader"], { tags: ["public-faq"] });

export const getPublicNavigation = unstable_cache(async (): Promise<ReaderResult<PublicNavigationItem[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: [...fallbackSite.navigation] };
  try { const navigation = await prisma.navigation.findUnique({ where: { kind: "HEADER" }, include: { items: { where: { enabled: true }, orderBy: { order: "asc" } } } }); const items = navigation?.items.filter((item) => safeHref(item.href)).map((item) => ({ label: item.label, href: item.href })) ?? []; return items.length ? { source: "cms", data: items } : { source: "fallback", data: [...fallbackSite.navigation] }; } catch { return { source: "fallback", data: [...fallbackSite.navigation] }; }
}, ["public-navigation-reader"], { tags: ["public-navigation"] });

export const getPublicSiteSettings = unstable_cache(async (): Promise<ReaderResult<typeof fallbackSettings>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackSettings };
  try { const setting = await prisma.siteSetting.findUnique({ where: { key: "global" } }); const value = setting?.value as { siteName?: string; contactEmail?: string; description?: string } | null; return value ? { source: "cms", data: { name: value.siteName || fallbackSite.name, email: value.contactEmail || fallbackSite.email, description: value.description || fallbackSite.description } } : { source: "fallback", data: fallbackSettings }; } catch { return { source: "fallback", data: fallbackSettings }; }
}, ["public-settings-reader"], { tags: ["public-settings"] });

export const getPublicPageContent = unstable_cache(async (slug: string): Promise<ReaderResult<PublicPageContent | undefined>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: undefined };
  try { const page = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" }, include: { sections: { where: { enabled: true }, orderBy: { order: "asc" } } } }); return page?.sections.length ? { source: "cms", data: { title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription, sections: page.sections.map((section) => ({ type: section.type, content: section.content, order: section.order })) } } : { source: "fallback", data: undefined }; } catch { return { source: "fallback", data: undefined }; }
}, ["public-page-reader"], { tags: ["public-pages", "public-studio", "public-contact"] });

export const getPublicHomeContent = unstable_cache(async () => {
  const [projects, services, faq, page] = await Promise.all([getPublicProjects(), getPublicServices(), getPublicFaq(), getPublicPageContent("home")]);
  const collectMediaIds = (value: unknown): string[] => { if (!value || typeof value !== "object") return []; if (Array.isArray(value)) return value.flatMap(collectMediaIds); return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => /MediaId(s)?$/.test(key) ? (Array.isArray(child) ? child.filter((id): id is string => typeof id === "string") : typeof child === "string" ? [child] : []) : collectMediaIds(child)); };
  const mediaIds = page.data?.sections.flatMap((section) => collectMediaIds(section.content)) ?? [];
  const media = hasDatabaseUrl() && mediaIds.length ? await prisma.media.findMany({ where: { id: { in: [...new Set(mediaIds)] } }, select: { id: true, publicUrl: true, focalX: true, focalY: true } }).catch(() => []) : [];
  return { source: projects.source === "cms" || services.source === "cms" || faq.source === "cms" || page.source === "cms" ? "cms" as const : "fallback" as const, projects: projects.data, services: services.data, faqs: faq.data, page: page.data, media: Object.fromEntries(media.map((item) => [item.id, item])) };
}, ["public-home-reader"], { tags: ["public-home", "public-projects", "public-services", "public-faq", "public-pages"] });
