import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getPublicHomeContent } from "@/lib/public/readers";

export default async function Page() { const content = await getPublicHomeContent(); return <SiteChrome><main><HomePage content={content} /></main></SiteChrome>; }
