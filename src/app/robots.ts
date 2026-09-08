import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public/seo";
export default async function robots(): Promise<MetadataRoute.Robots> { return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }], sitemap: `${await publicSiteUrl()}/sitemap.xml` }; }
