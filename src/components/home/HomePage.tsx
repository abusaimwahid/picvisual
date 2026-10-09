"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { caseStudyHref } from "@/cms/case-studies";
import type { Project, PublicAsset } from "@/content/work";
import { services as fallbackServices, type Service } from "@/content/services";
import { faqs as fallbackFaqs } from "@/content/faq";
import { demoMedia, demoPortfolio, demoWorlds, type DemoAsset } from "@/content/demo-media";
import { CmsImage } from "@/components/ui/CmsImage";
import { MediaVideo } from "@/components/ui/MediaVideo";
import { isRenderableImageAsset, isRenderableVideoSource } from "@/lib/media/image-source";
import { homepageProjectMode, resolvedHomepageMediaIds, type HomepageSection } from "./homepage-model";
import { useHomeMotion } from "./useHomeMotion";

type PublicMedia = PublicAsset & { mediaType?: string; sampleLabel?: string };
type HomeContent = {
  services: Service[];
  projects: Project[];
  faqs: [string, string][];
  testimonials?: Array<{ id: string; quote: string; person: string | null; role: string | null; company: string | null }>;
  page?: { sections: HomepageSection[] };
  media?: Record<string, PublicMedia>;
};
type HeroContent = {
  eyebrow?: string; headline?: string; description?: string;
  primaryCta?: { label?: string; href?: string }; secondaryCta?: { label?: string; href?: string };
  mediaMode?: "AUTO" | "IMAGE" | "VIDEO"; overlayStrength?: "soft" | "medium" | "strong";
  primaryMediaId?: string; secondaryMediaId?: string; backgroundMediaId?: string; mobileMediaId?: string;
  videoMediaId?: string; posterMediaId?: string;
};
type ImmersiveContent = {
  label?: string; heading?: string; description?: string;
  primaryMediaId?: string; secondaryMediaId?: string; tertiaryMediaId?: string; mobileMediaId?: string;
  posterMediaId?: string; rawMediaId?: string; finishedMediaId?: string; videoMediaId?: string;
  finalFrameMediaId?: string; sourceMediaId?: string; cutoutMediaId?: string; finalMediaId?: string;
  campaignMediaId?: string; macroMediaId?: string; supportingMediaId?: string; backgroundMediaId?: string;
  subjectMediaId?: string; shadowMediaId?: string; lightMediaId?: string; textureMediaId?: string;
  interfaceMediaId?: string; fragmentMediaId?: string; screenshotMediaId?: string;
  detailMediaIds?: string[]; timelineMediaIds?: string[]; reelMediaIds?: string[]; posterMediaIds?: string[];
};
type WorkItem = { key: string; title: string; category: string; summary: string; asset?: PublicMedia; href?: string; sample?: boolean };

const IMMERSIVE_TYPES = ["imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"] as const;
const capabilityRows = [
  ["High-end retouching", "E-commerce", "Fashion", "Beauty", "Color consistency", "Apparel"],
  ["Video editing", "Motion", "Campaign finishing", "Social delivery", "Color grading", "Format adaptation"],
  ["Jewelry", "Product finishing", "Compositing", "CGI", "Quality control", "Creative production"],
];
const defaults = {
  hero: {
    eyebrow: "IMAGE • VIDEO • E-COMMERCE POST",
    headline: "From raw capture to campaign-ready.",
    description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion.",
    primaryCta: { label: "View Selected Work", href: "#selected-work" },
    secondaryCta: { label: "Start a Project", href: "/contact" },
    mediaMode: "AUTO" as const,
    overlayStrength: "medium" as const,
  },
  positioning: {
    headline: "Your production partner after the shoot.",
    body: "From high-volume catalogs to campaign imagery and short-form motion, PicVisual gives visual teams one clear production partner across every channel.",
    highlight: "Raw in. Refined out.",
  },
};

function section<T>(sections: HomepageSection[] | undefined, type: string) {
  const value = sections?.find((item) => item.type === type)?.content;
  return value && typeof value === "object" ? value as T : undefined;
}

function mediaIdsFrom(type: string, content: ImmersiveContent | undefined) {
  if (!content) return [] as string[];
  const values: Array<string | string[] | undefined> = type === "imagePost"
    ? [content.finishedMediaId, content.primaryMediaId, content.rawMediaId, content.detailMediaIds, content.secondaryMediaId]
    : type === "product" ? [content.finalMediaId, content.campaignMediaId, content.primaryMediaId, content.sourceMediaId, content.cutoutMediaId]
      : type === "jewelry" ? [content.primaryMediaId, content.macroMediaId, content.supportingMediaId, content.secondaryMediaId]
        : type === "videoEdit" ? [content.videoMediaId, content.finalFrameMediaId, content.timelineMediaIds, content.primaryMediaId, content.posterMediaId]
          : type === "motion" ? [content.reelMediaIds, content.primaryMediaId, content.posterMediaIds, content.secondaryMediaId]
            : type === "development" ? [content.interfaceMediaId, content.screenshotMediaId, content.fragmentMediaId, content.primaryMediaId]
              : [content.finalMediaId, content.subjectMediaId, content.backgroundMediaId, content.primaryMediaId, content.textureMediaId, content.secondaryMediaId];
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []))];
}

function isRenderablePublicMedia(asset: PublicMedia | null | undefined): asset is PublicMedia {
  if (!asset) return false;
  return asset.mediaType === "VIDEO" ? isRenderableVideoSource(asset.publicUrl) : isRenderableImageAsset(asset);
}

function MediaAsset({ asset, priority = false, className = "pvh-media", poster }: { asset: PublicMedia; priority?: boolean; className?: string; poster?: string }) {
  return asset.mediaType === "VIDEO"
    ? <MediaVideo className={className} src={asset.publicUrl} poster={poster} label={asset.alt || "PicVisual motion"} decorative autoPlay loop priority={priority} />
    : <CmsImage className={className} asset={asset} priority={priority} sizes="(max-width: 767px) 100vw, 60vw" />;
}

function SampleLabel({ asset }: { asset: PublicMedia }) {
  return asset.sampleLabel ? <span className="pvh-sample-label">{asset.sampleLabel}</span> : null;
}

function resolveHeroMedia(hero: HeroContent, media: Record<string, PublicMedia>) {
  const video = hero.videoMediaId ? media[hero.videoMediaId] : undefined;
  const imageId = [hero.primaryMediaId, hero.backgroundMediaId, hero.mobileMediaId, hero.secondaryMediaId].find((id) => id && media[id]);
  const image = imageId ? media[imageId] : undefined;
  if (hero.mediaMode === "IMAGE") return image;
  if (hero.mediaMode === "VIDEO") return video ?? image;
  return video ?? image;
}

function WorkCard({ item, index, legacyClass = false }: { item: WorkItem; index: number; legacyClass?: boolean }) {
  const className = `${legacyClass ? "pvh-project pvh-work-item " : ""}pvh-work-card ${item.sample ? "is-sample" : ""}`.trim();
  const body = <><figure className={item.asset ? "has-media" : "is-typographic"}>{item.asset ? <><MediaAsset asset={item.asset} priority={index < 2} /><SampleLabel asset={item.asset} /></> : <><span>PROJECT / {String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong></>}</figure><div><span>{String(index + 1).padStart(2, "0")} / {item.category}</span><h3>{item.title}</h3><p>{item.summary}</p></div></>;
  return item.href ? <Link className={className} href={item.href}>{body}</Link> : <article className={className}>{body}</article>;
}

export function HomePage({ content }: { content?: HomeContent }) {
  const root = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeService, setActiveService] = useState(0);
  const sections = content?.page?.sections;
  const media = useMemo(() => Object.fromEntries(Object.entries(content?.media ?? {}).filter(([, asset]) => isRenderablePublicMedia(asset))), [content?.media]);
  const services = content?.services?.length ? content.services : fallbackServices;
  const faqs = content?.faqs?.length ? content.faqs : fallbackFaqs;
  const testimonial = content?.testimonials?.[0];
  const hero = { ...defaults.hero, ...section<HeroContent>(sections, "hero") };
  const positioning = { ...defaults.positioning, ...section<{ headline?: string; body?: string; highlight?: string }>(sections, "positioning") };
  const capabilities = section<{ heading?: string; description?: string; serviceIds?: string[] }>(sections, "capabilities");
  const selectedWork = section<{ heading?: string; description?: string; projectIds?: string[] }>(sections, "selectedWork");
  const workflow = section<{ heading?: string; description?: string; steps?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "productionWorkflow");
  const why = section<{ heading?: string; description?: string; items?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "whyPicVisual");
  const faqCopy = section<{ heading?: string }>(sections, "faq");
  const cta = section<{ eyebrow?: string; heading?: string; body?: string; cta?: { label?: string; href?: string } }>(sections, "cta");
  const gallerySection = section<{ mediaIds?: string[] }>(sections, "gallery");
  const selectedServices = capabilities?.serviceIds?.length ? capabilities.serviceIds.flatMap((id) => services.filter((item) => item.id === id)) : services;
  const chosenProjects = selectedWork?.projectIds?.length ? selectedWork.projectIds.flatMap((id) => (content?.projects ?? []).filter((project) => project.id === id)) : (content?.projects ?? []).filter((project) => project.featured !== false);
  const projectMode = homepageProjectMode(chosenProjects.length);
  const galleryIds = (gallerySection?.mediaIds || []).filter((id) => media[id]).slice(0, 8);
  const galleryAssets = galleryIds.map((id) => media[id]);
  const heroAsset = resolveHeroMedia(hero, media) ?? demoMedia.filmFrame;
  const heroPoster = hero.posterMediaId && media[hero.posterMediaId] ? media[hero.posterMediaId].publicUrl : undefined;
  const mediaSource = resolvedHomepageMediaIds(sections, media).length ? "cms" : "demo";

  const immersiveWorlds = useMemo(() => (sections || [])
    .filter((item) => IMMERSIVE_TYPES.includes(item.type as typeof IMMERSIVE_TYPES[number]))
    .map((item) => {
      const value = item.content as ImmersiveContent;
      const assets = mediaIdsFrom(item.type, value).filter((id) => media[id]).map((id) => media[id]).slice(0, 2);
      return { type: item.type, label: value.label || item.type.replace(/([A-Z])/g, " $1"), heading: value.heading || item.type, description: value.description || "", assets, source: "cms" as const };
    }).filter((world) => world.assets.length), [media, sections]);
  const worlds = demoWorlds.map((fallback) => immersiveWorlds.find((world) => world.type === fallback.type) ?? { ...fallback, assets: [...fallback.assets], source: "demo" as const }).slice(0, 5);
  const servicePanels = [0, 1, 2, 3].map((index) => {
    const service = selectedServices[index] ?? fallbackServices[index];
    const configured = isRenderableImageAsset(service?.hero) ? service.hero as PublicMedia : undefined;
    const fallback = [demoMedia.beautyDetail, demoMedia.filmFrame, demoMedia.productPolished, demoMedia.compositingLayers][index];
    return { service, asset: configured ?? worlds[index]?.assets[0] ?? fallback, sample: !configured && worlds[index]?.source !== "cms" };
  });
  const steps = workflow?.steps?.filter((step) => step.enabled !== false) ?? [{ title: "Brief" }, { title: "Prepare" }, { title: "Finish" }, { title: "Review" }, { title: "Deliver" }];
  const reasons = why?.items?.filter((item) => item.enabled !== false) ?? [
    { title: "Careful visual craft", description: "Attention to tone, texture and the original capture." },
    { title: "Consistent delivery", description: "A shared finish carried across every asset." },
    { title: "Clear collaboration", description: "Briefs, review stages and handoffs agreed together." },
  ];
  const workItems: WorkItem[] = chosenProjects.length ? chosenProjects.slice(0, 8).map((project) => ({
    key: project.id || project.slug, title: project.title, category: project.category, summary: project.summary,
    asset: (isRenderableImageAsset(project.thumbnail) ? project.thumbnail : isRenderableImageAsset(project.hero) ? project.hero : undefined) as PublicMedia | undefined,
    href: caseStudyHref(project),
  })) : demoPortfolio.map((item, index) => ({ key: `sample-${index}`, title: item.title, category: item.category, summary: `${item.scope} / ${item.summary}`, asset: item.asset, sample: true }));
  const leftWork = workItems.filter((_, index) => index % 2 === 0);
  const rightWork = workItems.filter((_, index) => index % 2 === 1);
  const finaleAsset = galleryAssets[0] ?? workItems.find((item) => item.asset)?.asset ?? demoMedia.productPolished;

  useHomeMotion(root);

  return <div ref={root} className="pvh-home" data-media-mode={mediaSource} data-project-mode={projectMode}>
    <section className="pvh-hero has-media">
      <div className="pvh-hero-media"><MediaAsset asset={heroAsset} priority poster={heroPoster} /><SampleLabel asset={heroAsset} /><span className="pvh-hero-shade" /></div>
      <div className="pvh-hero-copy"><span className="pvh-kicker">{hero.eyebrow}</span><h1>{hero.headline}</h1></div>
      <div className="pvh-hero-support"><p>{hero.description}</p><Link href={hero.primaryCta.href || "#selected-work"}>{hero.primaryCta.label}<i>↓</i></Link></div>
      <div className="pvh-hero-ticker" aria-hidden="true"><div>{[...capabilityRows[0], ...capabilityRows[0]].map((item, index) => <span key={`${item}-${index}`}>{item}<i>•</i></span>)}</div></div>
    </section>

    <section className="pvh-mission" data-reveal><span className="pvh-index">01 / POSITIONING</span><div><h2>{positioning.headline}</h2><p><strong>{positioning.highlight}</strong> {positioning.body}</p></div></section>

    <section className="pvh-horizontal" data-scene="horizontal">
      <div className="pvh-horizontal-stage">
        <div className="pvh-category-bar"><span>02 / CAPABILITIES</span><div>{worlds.map((world, index) => <button type="button" key={world.type} data-panel-index={index} aria-pressed={index === 0}>{world.label}</button>)}<button type="button" data-panel-index={worlds.length} aria-pressed="false">Workflow</button></div></div>
        <div className="pvh-horizontal-viewport"><div className="pvh-horizontal-track">
          {worlds.map((world, index) => <article className="pvh-capability-panel" key={world.type} data-panel={index}>
            <figure><MediaAsset asset={world.assets[0]} /><SampleLabel asset={world.assets[0]} /></figure>
            <div><span>{String(index + 1).padStart(2, "0")} / {world.label}</span><h2>{world.heading}</h2><p>{world.description}</p><ul>{capabilityRows[index % capabilityRows.length].slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul></div>
          </article>)}
          <article className="pvh-workflow-panel" data-panel={worlds.length}>
            <figure><MediaAsset asset={galleryAssets[1] ?? demoMedia.workstation} /><SampleLabel asset={galleryAssets[1] ?? demoMedia.workstation} /></figure>
            <div><span>WORKFLOW / ONE CONNECTED SYSTEM</span><h2>{workflow?.heading || "From brief to final delivery."}</h2><p>{workflow?.description || "A clear production path keeps every asset visible, consistent and ready for its channel."}</p><ol>{steps.map((step, index) => <li key={`${step.title}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b>{step.title}</li>)}</ol><Link href="/services">Explore the process <i>↗</i></Link></div>
          </article>
        </div></div>
        <div className="pvh-horizontal-progress" aria-hidden="true"><span /></div>
      </div>
    </section>

    <section className="pvh-marquees" aria-label="PicVisual capabilities">{capabilityRows.map((row, rowIndex) => <div className={rowIndex % 2 ? "is-reverse" : ""} key={rowIndex}><p>{[...row, ...row].map((item, index) => <span key={`${item}-${index}`}>{item}<i>✦</i></span>)}</p></div>)}</section>

    <section className="pvh-services" data-scene="services"><div className="pvh-services-stage">
      <header><span className="pvh-index">03 / SERVICES</span><h2>{capabilities?.heading || "Every frame has a finish."}</h2><p>{capabilities?.description || "Four connected capabilities, one consistent visual standard."}</p></header>
      <div className="pvh-service-panels">{servicePanels.map(({ service, asset, sample }, index) => <button key={`${service?.title}-${index}`} type="button" className={`pvh-service-panel ${activeService === index ? "is-active" : ""}`} aria-pressed={activeService === index} onMouseEnter={() => setActiveService(index)} onFocus={() => setActiveService(index)} onClick={() => setActiveService(index)}>
        <figure><MediaAsset asset={asset} />{sample && <SampleLabel asset={asset} />}</figure><span><small>{String(index + 1).padStart(2, "0")}</small><strong>{service?.shortTitle}</strong><em>{service?.description}</em><i>↗</i></span>
      </button>)}</div>
    </div></section>

    {testimonial && <section className="pvh-proof" data-reveal><span className="pvh-index">CLIENT PERSPECTIVE</span><blockquote>“{testimonial.quote}”</blockquote><p>{[testimonial.person, testimonial.role, testimonial.company].filter(Boolean).join(" / ")}</p></section>}

    <section id="selected-work" className={`pvh-work pvh-gallery ${projectMode === "empty" ? "pvh-sample-projects" : ""}`} data-scene="work" data-source={projectMode === "empty" ? "demo" : "cms"}>
      <div className="pvh-work-mobile"><header><span className="pvh-index">04 / SELECTED WORK</span><h2>{selectedWork?.heading || "Selected work"}</h2></header>{workItems.map((item, index) => <WorkCard key={item.key} item={item} index={index} />)}</div>
      <div className="pvh-work-stage">
        <div className="pvh-work-gallery"><div className="pvh-work-column is-left">{leftWork.map((item, index) => <WorkCard key={item.key} item={item} index={index * 2} legacyClass={projectMode !== "empty"} />)}</div><div className="pvh-work-column is-right">{rightWork.map((item, index) => <WorkCard key={item.key} item={item} index={index * 2 + 1} legacyClass={projectMode !== "empty"} />)}</div></div>
        <header className="pvh-work-heading"><span className="pvh-index">04 / SELECTED WORK</span><h2>{selectedWork?.heading || "Selected work"}</h2><p data-work-caption>{selectedWork?.description || "A moving study of detail, finish and visual continuity."}</p><Link href="/work">View all work <i>↗</i></Link></header>
        <div className="pvh-work-finale"><figure><MediaAsset asset={finaleAsset} /></figure><div><span>PROJECT CANVAS / COMPLETE</span><h2>One visual standard across every frame.</h2><Link href="/contact">Start a project <i>↗</i></Link></div></div>
      </div>
    </section>

    <section className="pvh-cta"><figure><MediaAsset asset={galleryAssets[2] ?? demoMedia.compositingLayers} /><SampleLabel asset={galleryAssets[2] ?? demoMedia.compositingLayers} /></figure><div><span className="pvh-index">{cta?.eyebrow || "START A CONVERSATION"}</span><h2>{cta?.heading || "Have content in production?"}</h2><p>{cta?.body || "Let’s make it ready for market."}</p><Link href={cta?.cta?.href || "/contact"}>{cta?.cta?.label || "Start a project"}<i>↗</i></Link></div></section>

    {faqs.length > 0 && <section className="pvh-faq"><header><span className="pvh-index">FAQ</span><h2>{faqCopy?.heading || "Good work starts clear."}</h2></header><div>{faqs.map(([question, answer], index) => <article className={openFaq === index ? "is-open" : ""} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`home-faq-${index}`}><span>{question}</span><i>+</i></button><div id={`home-faq-${index}`} aria-hidden={openFaq !== index}><p>{answer}</p></div></article>)}</div></section>}

    <section className="pvh-why" data-scene="why"><div className="pvh-why-stage"><figure><MediaAsset asset={galleryAssets[3] ?? demoMedia.productMaterial} /></figure><div className="pvh-why-copy"><span className="pvh-index">05 / WHY PICVISUAL</span><h2>{why?.heading || "The finish should feel inevitable."}</h2><p>{why?.description || "A calm, collaborative production partner for exacting visual work."}</p><ol>{reasons.map((reason, index) => <li key={reason.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{reason.title}</strong><p>{reason.description}</p></div></li>)}</ol></div></div></section>
  </div>;
}
