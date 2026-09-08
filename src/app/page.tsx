import { pageMetadata } from "@/lib/public/seo";
export async function generateMetadata() { return pageMetadata("home", "PicVisual — Image & Video Post-Production", "Image, video and e-commerce post-production for brands, photographers and creative teams."); }
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getPublicHomeContent } from "@/lib/public/readers";

export default async function Page() { const content = await getPublicHomeContent(); return <SiteChrome><main id="main"><HomePage content={content} /></main></SiteChrome>; }
