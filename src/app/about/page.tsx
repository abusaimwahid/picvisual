import { pageMetadata } from "@/lib/public/seo";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { StudioContent } from "@/components/about/StudioContent";
import { getPublicAboutContent } from "@/lib/public/readers";
export async function generateMetadata() { return pageMetadata("about", "Studio — PicVisual", "The production partner after the shoot—image, motion and commercial post-production by PicVisual."); }
export default async function AboutPage() { const studio = await getPublicAboutContent(); return <SiteChrome><StudioContent content={studio.content} enabled={studio.enabled} order={studio.order} media={studio.media} services={studio.services} /></SiteChrome>; }
