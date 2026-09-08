import { publishedProject, publishedService, hydrateProject } from "@/cms/catalog-publication";
import { isSafeHref, settingInput } from "@/lib/validation/site";
import { unstable_cache } from "next/cache";
import { faqs as fallbackFaqs } from "@/content/faq";
import { services as fallbackServices, type Service as PublicService } from "@/content/services";
import { projects as fallbackProjects, type Project as PublicProject } from "@/content/work";
import { site as fallbackSite } from "@/content/site";
import { mapProjectToPublicProject, mapServiceToPublicService } from "@/lib/adapters/public-content";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { HOMEPAGE_PUBLISHED_NOTE, publishedSnapshotToPage, readHomepageSnapshot } from "@/cms/homepage-publication";

export type ReaderResult<T> = { source: "cms" | "fallback"; data: T };
export type PublicNavigationItem = { label: string; href: string; openInNewTab?: boolean };
export type PublicPageContent = { title: string; seoTitle?: string | null; seoDescription?: string | null; sections: Array<{ type: string; content: unknown; order: number }> };

const fallbackSettings = { name: fallbackSite.name as string, email: fallbackSite.email as string, description: fallbackSite.description as string, siteUrl: "https://picvisual.com", ctaLabel: "Start a Project", ctaHref: "/contact", footerText: "Image + video finishing for brands and creative teams.", seoTitle: "PicVisual — Image & Video Post-Production", phone: "", location: "", copyright: "", socialLinks: "", ogImageId: "" };

export const getPublicProjects = unstable_cache(async (): Promise<ReaderResult<PublicProject[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackProjects };
  try {
    const records = await prisma.project.findMany({ where: { status: "PUBLISHED" } });
    const published = records.flatMap((record) => { const value = publishedProject(record); return value ? [value] : []; });
    published.sort((a, b) => Number(b.featured) - Number(a.featured) || (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999) || a.title.localeCompare(b.title));
    return { source: "cms", data: await Promise.all(published.map(async (record, index) => mapProjectToPublicProject(await hydrateProject(prisma, record), index))) };
  } catch { return { source: "fallback", data: [] }; }
}, ["public-projects-reader"], { tags: ["public-projects"] });

export async function getPublicProjectBySlug(slug: string): Promise<ReaderResult<PublicProject | undefined>> {
  const projects = await getPublicProjects();
  return { source: projects.source, data: projects.data.find((project) => project.slug === slug) };
}

export const getPublicServices = unstable_cache(async (): Promise<ReaderResult<PublicService[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackServices };
  try {
    const records = await prisma.service.findMany({ where: { status: "PUBLISHED" } });
    const published = records.flatMap((record) => { const value = publishedService(record); return value ? [value] : []; });
    published.sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999) || a.title.localeCompare(b.title));
    const media = await prisma.media.findMany({ where: { id: { in: published.flatMap((item) => [item.heroMediaId, item.thumbnailMediaId].filter((id): id is string => !!id)) } } });
    return { source: "cms", data: published.map((item, index) => mapServiceToPublicService({ ...item, heroMedia: media.find((asset) => asset.id === item.heroMediaId), thumbnailMedia: media.find((asset) => asset.id === item.thumbnailMediaId) }, index)) };
  } catch { return { source: "fallback", data: fallbackServices }; }
}, ["public-services-reader"], { tags: ["public-services"] });

export async function getPublicServiceBySlug(slug: string) { const all = await getPublicServices(); return { ...all, data: all.data.find((service) => service.slug === slug) }; }

export const getPublicFaq = unstable_cache(async (): Promise<ReaderResult<[string, string][]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackFaqs as [string, string][] };
  try { const faq = await prisma.fAQ.findMany({ where: { enabled: true, pageKey: "home" }, orderBy: { order: "asc" } }); return { source: "cms", data: faq.map((item) => [item.question, item.answer]) }; } catch { return { source: "fallback", data: fallbackFaqs as [string, string][] }; }
}, ["public-faq-reader"], { tags: ["public-faq"] });

export const getPublicNavigation = unstable_cache(async (kind: "HEADER" | "FOOTER" = "HEADER"): Promise<ReaderResult<PublicNavigationItem[]>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: [...fallbackSite.navigation] };
  try {
    const navigation = await prisma.navigation.findUnique({ where: { kind }, include: { items: { where: { enabled: true }, orderBy: { order: "asc" } } } });
    if (!navigation) return { source: "fallback", data: [...fallbackSite.navigation] };
    return { source: "cms", data: navigation.items.filter((item) => isSafeHref(item.href)).map(({ label, href, openInNewTab }) => ({ label, href, openInNewTab })) };
  } catch { return { source: "fallback", data: [...fallbackSite.navigation] }; }
}, ["public-navigation-reader"], { tags: ["public-navigation"] });

export const getPublicSiteSettings = unstable_cache(async (): Promise<ReaderResult<typeof fallbackSettings>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: fallbackSettings };
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "global" } });
    const parsed = settingInput.safeParse(setting?.value);
    if (!parsed.success) return { source: "fallback", data: fallbackSettings };
    const value = parsed.data;
    return { source: "cms", data: { ...fallbackSettings, ...value, name: value.siteName, email: value.contactEmail, footerText: value.footerText || fallbackSettings.footerText, seoTitle: value.seoTitle || fallbackSettings.seoTitle } };
  } catch { return { source: "fallback", data: fallbackSettings }; }
}, ["public-settings-reader"], { tags: ["public-settings"] });

export const getPublicPageContent = unstable_cache(async (slug: string): Promise<ReaderResult<PublicPageContent | undefined>> => {
  if (!hasDatabaseUrl()) return { source: "fallback", data: undefined };
  try {
    const page = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" }, include: { sections: { where: { enabled: true }, orderBy: { order: "asc" } }, revisions: slug === "home" ? { where: { note: HOMEPAGE_PUBLISHED_NOTE }, orderBy: { createdAt: "desc" }, take: 1 } : false } });
    if (!page) return { source: "cms", data: undefined };
    if (slug === "home") {
      const snapshot = readHomepageSnapshot(page.revisions[0]?.snapshot);
      // Until the first draft edit creates a published baseline, retain the approved seeded page.
      if (snapshot) return { source: "cms", data: publishedSnapshotToPage(snapshot) };
    }
    return { source: "cms", data: { title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription, sections: page.sections.map((section) => ({ type: section.type, content: section.content, order: section.order })) } };
  } catch { return { source: "fallback", data: undefined }; }
}, ["public-page-reader"], { tags: ["public-pages", "public-studio", "public-contact"] });

async function homepageFaq(page: PublicPageContent | undefined, fallback: [string, string][]): Promise<[string, string][]> {
  const section = page?.sections.find((section) => section.type === "faq")?.content as { displayMode?: string; faqIds?: string[] } | undefined;
  if (section?.displayMode !== "SELECTED") return fallback;
  if (!hasDatabaseUrl() || !section.faqIds?.length) return [];
  const records = await prisma.fAQ.findMany({ where: { id: { in: section.faqIds }, enabled: true, pageKey: "home" } });
  return section.faqIds.flatMap((id) => { const record = records.find((item) => item.id === id); return record ? [[record.question, record.answer] as [string, string]] : []; });
}

export const getPublicHomeContent = unstable_cache(async () => {
  const [projects, services, faq, page] = await Promise.all([getPublicProjects(), getPublicServices(), getPublicFaq(), getPublicPageContent("home")]);
  const collectMediaIds = (value: unknown): string[] => { if (!value || typeof value !== "object") return []; if (Array.isArray(value)) return value.flatMap(collectMediaIds); return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => /MediaId(s)?$/.test(key) ? (Array.isArray(child) ? child.filter((id): id is string => typeof id === "string") : typeof child === "string" ? [child] : []) : collectMediaIds(child)); };
  const mediaIds = page.data?.sections.flatMap((section) => collectMediaIds(section.content)) ?? [];
  const media = hasDatabaseUrl() && mediaIds.length ? await prisma.media.findMany({ where: { id: { in: [...new Set(mediaIds)] } }, select: { id: true, publicUrl: true, alt: true, mediaType: true, width: true, height: true, focalX: true, focalY: true } }).catch(() => []) : [];
  return { source: projects.source === "cms" || services.source === "cms" || faq.source === "cms" || page.source === "cms" ? "cms" as const : "fallback" as const, projects: projects.data, services: services.data, faqs: await homepageFaq(page.data, faq.data), page: page.data, media: Object.fromEntries(media.map((item) => [item.id, item])) };
}, ["public-home-reader"], { tags: ["public-home", "public-projects", "public-services", "public-faq", "public-pages"] });

/** This is intentionally uncached and is only called by the authenticated admin preview route. */
export async function getDraftHomeContent() {
  if (!hasDatabaseUrl()) return getPublicHomeContent();
  const [projects, services, faq, page] = await Promise.all([
    getPublicProjects(), getPublicServices(), getPublicFaq(),
    prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { where: { enabled: true }, orderBy: { order: "asc" } } } }),
  ]);
  const sections = page?.sections.map((section) => ({ type: section.type, content: section.content, order: section.order })) ?? [];
  const collectMediaIds = (value: unknown): string[] => { if (!value || typeof value !== "object") return []; if (Array.isArray(value)) return value.flatMap(collectMediaIds); return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => /MediaId(s)?$/.test(key) ? (Array.isArray(child) ? child.filter((id): id is string => typeof id === "string") : typeof child === "string" ? [child] : []) : collectMediaIds(child)); };
  const ids = sections.flatMap((section) => collectMediaIds(section.content));
  const media = ids.length ? await prisma.media.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, publicUrl: true, alt: true, mediaType: true, width: true, height: true, focalX: true, focalY: true } }).catch(() => []) : [];
  return { source: "cms" as const, projects: projects.data, services: services.data, faqs: await homepageFaq(page ? { title: page.title, sections } : undefined, faq.data), page: page ? { title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription, sections } : undefined, media: Object.fromEntries(media.map((item) => [item.id, item])) };
}

export const getPublicStudioProof = unstable_cache(async () => {
  if (!hasDatabaseUrl()) return { clients: [], testimonials: [] };
  try {
    const [clients, testimonials] = await Promise.all([
      prisma.client.findMany({ where: { enabled: true }, include: { logoMedia: true }, orderBy: { order: "asc" } }),
      prisma.testimonial.findMany({ where: { enabled: true }, include: { media: true }, orderBy: { order: "asc" } }),
    ]);
    return { clients, testimonials };
  } catch { return { clients: [], testimonials: [] }; }
}, ["public-studio-proof"], { tags: ["public-clients", "public-testimonials"] });
