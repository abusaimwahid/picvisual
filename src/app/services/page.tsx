import Link from "next/link";
import { pageMetadata } from "@/lib/public/seo";
import { getPageCopy } from "@/lib/public/page-copy";
import { CmsImage } from "@/components/ui/CmsImage";
import { isRenderableImageAsset } from "@/lib/media/image-source";
import { demoMedia, demoServiceMedia } from "@/content/demo-media";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { getPublicServices } from "@/lib/public/readers";

export async function generateMetadata() { return pageMetadata("services", "Services — PicVisual", "Image, motion and creative post-production services for modern commercial content teams."); }

export default async function ServicesPage() {
  const [{ data: services }, copy] = await Promise.all([getPublicServices(), getPageCopy("services")]);
  const firstCmsHero = services.find((service) => isRenderableImageAsset(service.hero))?.hero;
  const heroAsset = firstCmsHero ?? demoMedia.productPolished;
  return <SiteChrome><main id="main" className="inner-page services-page">
    <section className="public-inner-hero services-hero" data-public-reveal>
      <div className="public-inner-hero-copy"><span className="eyebrow">SERVICES</span><h1>{copy.title.replace("Post-production", "Post‑production")}</h1><p>{copy.body}</p><Link className="text-link" href="#service-categories">Explore capabilities <i>↓</i></Link></div>
      <div className="services-hero-composition">
        <figure className="services-hero-primary"><CmsImage asset={heroAsset} priority sizes="(max-width: 800px) 100vw, 58vw" />{!firstCmsHero && <figcaption>CONCEPT VISUAL</figcaption>}</figure>
        <figure className="services-hero-detail" aria-hidden="true"><CmsImage asset={demoMedia.gemstone} sizes="22vw" /></figure>
        <figure className="services-hero-strip" aria-hidden="true"><CmsImage asset={demoMedia.motionSequence} sizes="34vw" /></figure>
      </div>
    </section>

    <section className="services-positioning" data-public-reveal><span className="eyebrow">ONE VISUAL STANDARD</span><h2>Every asset finished for the place it needs to perform.</h2><p>From individual hero frames to high-volume content systems, the work stays precise, consistent and ready for modern channels.</p></section>

    <section id="service-categories" className="services-stack" aria-label="Service categories">
      {services.map((service, index) => {
        const hasHero = isRenderableImageAsset(service.hero);
        const asset = hasHero ? service.hero! : demoServiceMedia[index % demoServiceMedia.length];
        return <article className={`service-panel service-panel-${index + 1}`} key={service.title} data-public-reveal>
          <div className="service-panel-copy"><span>{service.index} / {service.shortTitle}</span><h2>{service.title}</h2><p>{service.description}</p><ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <figure><CmsImage asset={asset} className="service-media" sizes="(max-width: 800px) 100vw, 62vw" />{!hasHero && <figcaption>CONCEPT</figcaption>}</figure>
        </article>;
      })}
    </section>

    <section className="services-cta" data-public-reveal><div><span className="eyebrow">START A CONVERSATION</span><h2>{copy.approachHeading || "Have a brief in hand?"}</h2><p>Share the visual brief, intended channels and delivery needs. We’ll help shape a clear post-production path.</p><Link className="button button-light" href="/contact">Start a Project <i>↗</i></Link></div><figure><CmsImage asset={demoMedia.workstation} sizes="(max-width: 800px) 100vw, 42vw" /><figcaption>CONCEPT / PRODUCTION WORKFLOW</figcaption></figure></section>
  </main></SiteChrome>;
}
