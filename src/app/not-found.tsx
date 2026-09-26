import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CmsImage } from "@/components/ui/CmsImage";
import { demoMedia } from "@/content/demo-media";

export const metadata: Metadata = { title: "Page not found — PicVisual", description: "This PicVisual page could not be found.", robots: { index: false, follow: false } };

export default function NotFound() {
  return <SiteChrome><main id="main" className="status-page"><section data-public-reveal><span className="eyebrow">PICVISUAL / 404</span><h1>This page is<br />out of frame.</h1><p>The address may have changed. Explore selected work or return to the homepage.</p><div className="hero-actions"><Link className="button" href="/work">Back to Work ↗</Link><Link className="text-link dark" href="/">Back Home ↗</Link></div></section><figure><CmsImage asset={demoMedia.filmFrame} priority sizes="(max-width: 800px) 100vw, 48vw" /><figcaption>FRAME NOT FOUND / 404</figcaption></figure></main></SiteChrome>;
}
