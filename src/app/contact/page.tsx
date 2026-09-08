import { pageMetadata } from "@/lib/public/seo";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactForm } from "@/components/contact/ContactForm";
import { getPageCopy } from "@/lib/public/page-copy";
export async function generateMetadata() { return pageMetadata("contact", "Start a Project — PicVisual", "Tell PicVisual about your next image, motion or creative post-production project."); }
export default async function ContactPage() { const copy = await getPageCopy("contact"); return <SiteChrome><main id="main" className="contact-page"><section><span className="eyebrow">START A PROJECT</span><h1>{copy.title}</h1><p>{copy.body}</p><ul className="contact-expectations"><li>Clear brief and handoff</li><li>Test-project discussion when appropriate</li><li>Production scope agreed together</li></ul></section><ContactForm /></main></SiteChrome>; }
