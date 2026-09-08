import type { MetadataRoute } from "next";
import { getPublicProjects, getPublicPageContent } from "@/lib/public/readers";
import { publicSiteUrl } from "@/lib/public/seo";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = await publicSiteUrl(); const projects = (await getPublicProjects()).data; const routes = await Promise.all(["home", "work", "services", "about", "contact"].map(async (slug) => ({ slug, result: await getPublicPageContent(slug) }))); return [...routes.filter(({result}) => result.source === "fallback" || result.data).map(({slug}) => ({ url: `${base}${slug === "home" ? "" : `/${slug}`}` })), {url: `${base}/privacy`}, ...projects.map((project) => ({ url: `${base}/work/${project.slug}` }))]; }
