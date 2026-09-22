import { pageMetadata } from "@/lib/public/seo";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactForm } from "@/components/contact/ContactForm";
import { getPageCopy } from "@/lib/public/page-copy";
export async function generateMetadata() { return pageMetadata("contact", "Start a Project — PicVisual", "Tell PicVisual about your next image, motion or creative post-production project."); }
export default async function ContactPage() { const copy = await getPageCopy("contact"); const expectations = copy.approachBody.split("\n").map((item) => item.trim()).filter(Boolean); return <SiteChrome><main id="main" className="contact-page"><section><span className="eyebrow">START A PROJECT</span><h1>{copy.title}</h1><p>{copy.body}</p>{expectations.length > 0 && <><h2 className="sr-only">{copy.approachHeading || "What to expect"}</h2><ul className="contact-expectations">{expectations.map((item) => <li key={item}>{item}</li>)}</ul></>}</section><ContactForm /></main></SiteChrome>; }
