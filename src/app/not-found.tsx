import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";

export const metadata: Metadata = {
  title: "Page not found — PicVisual",
  description: "This PicVisual page could not be found.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <main id="main" className="inner-page status-page">
        <span className="eyebrow">PICVISUAL / 404</span>
        <h1>This page is<br />out of frame.</h1>
        <p>The address may have changed. Explore selected work or tell PicVisual about your project.</p>
        <div className="hero-actions">
          <Link className="button" href="/work">View Our Work ↗</Link>
          <Link className="text-link dark" href="/services">Services ↗</Link>
          <Link className="text-link dark" href="/contact">Contact PicVisual ↗</Link>
        </div>
      </main>
    </SiteChrome>
  );
}
