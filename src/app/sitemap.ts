import type { MetadataRoute } from "next";
import { projects } from "@/content/work";
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/work", "/services", "/about", "/contact"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() })).concat(projects.map((p) => ({ url: `${base}/work/${p.slug}`, lastModified: new Date() }))); }
