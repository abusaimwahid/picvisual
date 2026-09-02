import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactForm } from "@/components/contact/ContactForm";
import { getPublicPageContent } from "@/lib/public/readers";
export const metadata: Metadata = { title: "Start a Project — PicVisual", description: "Tell PicVisual about your next image, motion or creative post-production project." };
export default async function ContactPage() { const page = (await getPublicPageContent("contact")).data; const body = page?.sections.find((section) => section.type === "richText")?.content as { body?: string } | undefined; return <SiteChrome><main id="main" className="contact-page"><section><span className="eyebrow">START A PROJECT</span><h1>{page?.title ?? "Content in production? Let's talk."}</h1><p>{body?.body ?? "Tell us enough to understand the brief. We'll take it from there."}</p></section><ContactForm /></main></SiteChrome>; }
