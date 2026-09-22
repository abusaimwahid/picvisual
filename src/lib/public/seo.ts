import { getPublicBrandSettings } from "@/lib/brand/settings";
import type { Metadata } from "next";
import { getPublicPageContent, getPublicSiteSettings } from "./readers";
import { prisma, hasDatabaseUrl } from "@/lib/db/client";

export async function publicSiteUrl() {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) { try { const url = new URL(configured); if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.hostname === "localhost")) return url.origin; } catch {} }
  return (await getPublicSiteSettings()).data.siteUrl;
}
export async function pageMetadata(slug: string, title: string, description: string): Promise<Metadata> {
  const page = (await getPublicPageContent(slug)).data;
  const base = await publicSiteUrl(); const pageImage = hasDatabaseUrl() && page?.ogImageId ? await prisma.media.findUnique({ where: { id: page.ogImageId }, select: { publicUrl: true } }).catch(() => null) : null; const image = pageImage?.publicUrl || await defaultSocialImage(); const path = slug === "home" ? "/" : `/${slug}`; const canonical = page?.canonicalUrl || `${base}${path}`;
  return { title: page?.seoTitle || title, description: page?.seoDescription || description, robots: page?.indexable === false ? { index: false, follow: false } : undefined, alternates: { canonical }, openGraph: { title: page?.seoTitle || title, description: page?.seoDescription || description, url: canonical, type: "website", siteName: "PicVisual", ...(image ? { images: [{ url: image }] } : {}) }, twitter: { card: image ? "summary_large_image" : "summary", ...(image ? { images: [image] } : {}), title: page?.seoTitle || title, description: page?.seoDescription || description } };
}
export async function defaultSocialImage() {
  const settings = (await getPublicSiteSettings()).data;
  if (hasDatabaseUrl() && settings.ogImageId) { const media = await prisma.media.findUnique({ where: { id: settings.ogImageId } }).catch(() => null); if (media) return media.publicUrl; }
  return (await getPublicBrandSettings()).socialLogo?.url;
}
export const jsonLd = (value: object) => JSON.stringify(value).replace(/</g, "\\u003c");
