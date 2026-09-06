import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactForm } from "@/components/contact/ContactForm";
import { getPublicPageContent } from "@/lib/public/readers";
export const metadata: Metadata = { title: "Start a Project — PicVisual", description: "Tell PicVisual about your next image, motion or creative post-production project." };
export default async function ContactPage() { const page = (await getPublicPageContent("contact")).data; const body = page?.sections.find((section) => section.type === "richText")?.content as { body?: string } | undefined; return <SiteChrome><main id="main" className="contact-page"><section><span className="eyebrow">START A PROJECT</span><h1>{page?.title ?? "Have content in production? Let's make it ready for market."}</h1><p>{body?.body ?? "Share the brief, intended channels and the production context. We’ll use that to understand the work before the first handoff."}</p><ul className="contact-expectations"><li>Clear brief and handoff</li><li>Test-project discussion when appropriate</li><li>Secure production support</li></ul></section><ContactForm /></main></SiteChrome>; }
