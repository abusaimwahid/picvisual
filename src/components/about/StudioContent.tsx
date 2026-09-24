import Link from "next/link";
import { CmsImage } from "@/components/ui/CmsImage";
import { MediaVideo } from "@/components/ui/MediaVideo";
import type { AboutContent, AboutSectionType } from "@/content/about";
import type { Service } from "@/content/services";
import type { PublicAsset } from "@/content/work";
import { demoMedia, type DemoAsset } from "@/content/demo-media";

type StudioMedia = Record<string, PublicAsset & { mediaType: "IMAGE" | "VIDEO" }>;
const paragraphs = (text: string) => text.split(/\n\s*\n/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>);

function ManagedStudioMedia({ id, posterId, media, fallback, className, priority = false }: { id?: string; posterId?: string; media: StudioMedia; fallback?: DemoAsset; className?: string; priority?: boolean }) {
  const asset = (id ? media[id] : undefined) ?? fallback;
  if (!asset) return null;
  return asset.mediaType === "VIDEO" ? <MediaVideo src={asset.publicUrl} poster={posterId ? media[posterId]?.publicUrl : undefined} label={asset.alt || "PicVisual studio motion"} className={className} /> : <CmsImage asset={asset} className={className} priority={priority || asset.publicUrl.startsWith("/demo/")} sizes="(max-width: 800px) 100vw, 56vw" />;
}

export function StudioContent({ content, enabled, order, media, services }: { content: AboutContent; enabled: Set<AboutSectionType>; order: AboutSectionType[]; media: StudioMedia; services: Service[] }) {
  const sections: Record<AboutSectionType, React.ReactNode> = {
    hero: <section className="studio-hero" key="hero"><div className="studio-hero-copy"><span className="eyebrow">{content.hero.eyebrow}</span><h1>{content.hero.headline}</h1><p>{content.hero.body}</p><div className="studio-actions"><Link className="button button-light" href={content.hero.primaryHref}>{content.hero.primaryLabel} <i>↗</i></Link><Link className="text-link" href={content.hero.secondaryHref}>{content.hero.secondaryLabel} <i>↗</i></Link></div></div><div className="studio-hero-media"><ManagedStudioMedia id={content.hero.videoMediaId || content.hero.imageMediaId} posterId={content.hero.posterMediaId} media={media} fallback={demoMedia.creative} priority /><span>{(content.hero.videoMediaId || content.hero.imageMediaId) && media[content.hero.videoMediaId || content.hero.imageMediaId || ""] ? "POST / PRODUCTION" : "SAMPLE VISUAL / CREATIVE POST"}</span></div><b aria-hidden="true">PV</b></section>,
    who: <section className="studio-split studio-who" key="who"><div><span className="eyebrow">{content.who.eyebrow}</span><h2>{content.who.heading}</h2></div><div className="studio-copy">{paragraphs(content.who.body)}</div>{content.who.mediaId && <div className="studio-feature-media"><ManagedStudioMedia id={content.who.mediaId} media={media} /></div>}</section>,
    afterShoot: <section className="studio-after" key="afterShoot"><span className="eyebrow">{content.afterShoot.eyebrow}</span><div><h2>{content.afterShoot.heading}</h2><div>{paragraphs(content.afterShoot.body)}</div></div>{content.afterShoot.mediaId && <ManagedStudioMedia id={content.afterShoot.mediaId} media={media} />}</section>,
    approach: <section className="studio-approach" key="approach"><div><span className="eyebrow">{content.approach.eyebrow}</span><h2>{content.approach.heading}</h2><p>{content.approach.body}</p></div><ol>{content.approach.principles.filter(Boolean).map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></section>,
    collaboration: <section className="studio-collaboration" key="collaboration"><div><span className="eyebrow">{content.collaboration.eyebrow}</span><h2>{content.collaboration.heading}</h2><p>{content.collaboration.body}</p></div><div className="studio-audiences">{content.collaboration.audiences.filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div></section>,
    capabilities: <section className="studio-capabilities" key="capabilities"><header><span className="eyebrow">{content.capabilities.eyebrow}</span><h2>{content.capabilities.heading}</h2><p>{content.capabilities.body}</p></header><div>{services.map((service, index) => <article key={`${service.slug || service.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><h3>{service.title}</h3><p>{service.description}</p></article>)}</div></section>,
    studioMedia: <section className="studio-media-section" key="studioMedia"><div><span className="eyebrow">{content.studioMedia.eyebrow}</span><h2>{content.studioMedia.heading}</h2><p>{content.studioMedia.body}</p></div><div className="studio-media-fallback"><ManagedStudioMedia id={content.studioMedia.motionMediaId || content.studioMedia.mediaId} posterId={content.studioMedia.posterMediaId} media={media} fallback={demoMedia.motion} /><span>{(content.studioMedia.motionMediaId || content.studioMedia.mediaId) && media[content.studioMedia.motionMediaId || content.studioMedia.mediaId || ""] ? "STUDIO MOTION" : "SAMPLE VISUAL / MOTION + COLOUR"}</span></div></section>,
    workflow: <section className="studio-workflow" key="workflow"><div><span className="eyebrow">{content.workflow.eyebrow}</span><h2>{content.workflow.heading}</h2><p>{content.workflow.body}</p></div><ol>{content.workflow.steps.filter(Boolean).map((step, index) => <li key={`${step}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol></section>,
    cta: <section className="studio-cta" key="cta"><span className="eyebrow">{content.cta.eyebrow}</span><h2>{content.cta.heading}</h2><p>{content.cta.body}</p><div className="studio-actions"><Link className="button button-light" href={content.cta.primaryHref}>{content.cta.primaryLabel} <i>↗</i></Link><Link className="text-link" href={content.cta.secondaryHref}>{content.cta.secondaryLabel} <i>↗</i></Link></div></section>,
  };
  const ordered = [...new Set([...order, ...(Object.keys(sections) as AboutSectionType[]).filter((type) => !order.includes(type))])];
  return <main id="main" className="studio-page">{ordered.filter((type) => enabled.has(type)).map((type) => {
    if (type === "capabilities" && !services.length) return null;
    return sections[type];
  })}</main>;
}
