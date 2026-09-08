import { pageMetadata } from "@/lib/public/seo";
import Link from "next/link";
import { getPageCopy } from "@/lib/public/page-copy";
import { CmsImage } from "@/components/ui/CmsImage";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { getPublicServices } from "@/lib/public/readers";
export async function generateMetadata() { return pageMetadata("services", "Services — PicVisual", "Image, motion and creative post-production services for modern commercial content teams."); }
export default async function ServicesPage() { const [{ data: services }, copy] = await Promise.all([getPublicServices(), getPageCopy("services")]); return <SiteChrome><main id="main" className="inner-page"><section className="page-intro page-intro-services"><span className="eyebrow">SERVICES / ONE VISUAL STANDARD</span><h1>{copy.title}</h1><p>{copy.body}</p></section><section className="service-page-list">{services.map((service) => <article key={service.title}><div><span>{service.index}</span><h2>{service.title}</h2></div><p>{service.description}</p><ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul>{service.hero && <CmsImage asset={service.hero} className="service-media" />}</article>)}</section><section className="inline-cta"><p>{copy.approachHeading}</p><Link className="button" href="/contact">Start a Project <i>↗</i></Link></section></main></SiteChrome>; }
