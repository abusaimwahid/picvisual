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

type PublicMedia = PublicAsset & { mediaType?: string };
type HomeContent = {
  services: Service[];
  projects: Project[];
  faqs: [string, string][];
  page?: { sections: HomepageSection[] };
  media?: Record<string, PublicMedia>;
};
type HeroContent = {
  eyebrow?: string; headline?: string; description?: string;
  primaryCta?: { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
  mediaMode?: "AUTO" | "IMAGE" | "VIDEO";
  overlayStrength?: "soft" | "medium" | "strong";
  primaryMediaId?: string; secondaryMediaId?: string; backgroundMediaId?: string;
  mobileMediaId?: string; videoMediaId?: string; posterMediaId?: string;
};
type ImmersiveContent = {
  label?: string; heading?: string; description?: string;
  primaryMediaId?: string; secondaryMediaId?: string; tertiaryMediaId?: string;
  mobileMediaId?: string; posterMediaId?: string; rawMediaId?: string; finishedMediaId?: string;
  videoMediaId?: string; finalFrameMediaId?: string; sourceMediaId?: string; cutoutMediaId?: string;
  finalMediaId?: string; campaignMediaId?: string; macroMediaId?: string; supportingMediaId?: string;
  backgroundMediaId?: string; subjectMediaId?: string; shadowMediaId?: string; lightMediaId?: string;
  textureMediaId?: string; interfaceMediaId?: string; fragmentMediaId?: string; screenshotMediaId?: string;
  detailMediaIds?: string[];
  timelineMediaIds?: string[]; reelMediaIds?: string[]; posterMediaIds?: string[];
};

const IMMERSIVE_TYPES = ["imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"] as const;

const defaults = {
  hero: {
    eyebrow: "IMAGE • VIDEO • E-COMMERCE POST",
    headline: "From raw capture to campaign-ready.",
    description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion — with the consistency modern content teams need.",
    primaryCta: { label: "View Selected Work", href: "#selected-work" },
    secondaryCta: { label: "Start a Test Project", href: "/contact" },
    mediaMode: "AUTO" as const,
    overlayStrength: "medium" as const,
  },
  positioning: {
    headline: "Your production partner after the shoot.",
    body: "From high-volume e-commerce catalogs to campaign imagery and short-form motion, PicVisual gives brands one post-production partner for visual consistency across every channel.",
    highlight: "Raw in. Refined out.",
  },
};

const capabilityChips = [
  "HIGH-END RETOUCHING", "E-COMMERCE", "FASHION", "BEAUTY", "JEWELRY",
  "APPAREL", "VIDEO POST", "COLOR", "MOTION", "COMPOSITING",
];

function section<T>(sections: HomepageSection[] | undefined, type: string): T | undefined {
  const value = sections?.find((item) => item.type === type)?.content;
  return value && typeof value === "object" ? value as T : undefined;
}

function headlineLines(value: string) {
  if (value.includes("\n")) return value.split("\n").filter(Boolean);
  if (value.trim().toLowerCase() === "from raw capture to campaign-ready.") return ["From raw capture", "to campaign-ready."];
  return [value];
}

function mediaIdsFrom(type: string, content: ImmersiveContent | undefined) {
  if (!content) return [] as string[];
  const ordered: Array<string | string[] | undefined> = type === "imagePost"
    ? [content.finishedMediaId, content.primaryMediaId, content.rawMediaId, content.detailMediaIds, content.secondaryMediaId]
    : type === "product"
      ? [content.finalMediaId, content.campaignMediaId, content.primaryMediaId, content.sourceMediaId, content.cutoutMediaId, content.shadowMediaId]
      : type === "jewelry"
        ? [content.primaryMediaId, content.macroMediaId, content.supportingMediaId, content.secondaryMediaId]
        : type === "videoEdit"
          ? [content.videoMediaId, content.finalFrameMediaId, content.timelineMediaIds, content.primaryMediaId, content.secondaryMediaId, content.posterMediaId]
          : type === "motion"
            ? [content.reelMediaIds, content.primaryMediaId, content.posterMediaIds, content.secondaryMediaId]
            : type === "development"
              ? [content.interfaceMediaId, content.screenshotMediaId, content.fragmentMediaId, content.backgroundMediaId, content.primaryMediaId]
              : [content.finalMediaId, content.subjectMediaId, content.backgroundMediaId, content.primaryMediaId, content.textureMediaId, content.lightMediaId, content.secondaryMediaId];
  return [...new Set(ordered.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []))];
}

function MediaAsset({ asset, priority = false, className = "pvh-media", poster }: { asset: PublicMedia; priority?: boolean; className?: string; poster?: string }) {
  return asset.mediaType === "VIDEO"
    ? <MediaVideo className={className} src={asset.publicUrl} poster={poster} label={asset.alt || "PicVisual motion"} decorative autoPlay loop priority={priority} />
    : <CmsImage className={className} asset={asset} priority={priority} sizes="(max-width: 800px) 100vw, 70vw" />;
}

function isRenderablePublicMedia(asset: PublicMedia | null | undefined): asset is PublicMedia {
  if (!asset) return false;
  return asset.mediaType === "VIDEO" ? isRenderableVideoSource(asset.publicUrl) : isRenderableImageAsset(asset);
}

function DemoCaption({ asset }: { asset: DemoAsset }) {
  return <span className="pvh-sample-label">{asset.sampleLabel}</span>;
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const candidate = project.thumbnail ?? project.hero;
  const asset = isRenderableImageAsset(candidate) ? candidate : undefined;
  return (
    <Link href={caseStudyHref(project)} className={`pvh-project pvh-work-item project-${index + 1}`}>
      <div className={`pvh-project-visual ${asset ? "has-media" : "is-typographic"}`}>
        {asset
          ? <CmsImage asset={asset} priority={index === 0} sizes="(max-width: 800px) 100vw, 55vw" />
          : <><span>PROJECT / {String(index + 1).padStart(2, "0")}</span><strong>{project.title}</strong></>}
      </div>
      <div className="pvh-project-copy">
        <span>{project.category} · {project.scope}</span>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <b>{project.isCaseStudy ? "View Case Study" : "View Project"} ↗</b>
      </div>
    </Link>
  );
}

function resolveHeroMedia(hero: HeroContent, media: Record<string, PublicMedia>) {
  const mode = hero.mediaMode || "AUTO";
  const video = hero.videoMediaId && media[hero.videoMediaId] ? media[hero.videoMediaId] : undefined;
  const imageId = [hero.primaryMediaId, hero.backgroundMediaId, hero.mobileMediaId, hero.secondaryMediaId].find((id) => id && media[id]);
  const image = imageId ? media[imageId] : undefined;
  const poster = hero.posterMediaId && media[hero.posterMediaId] ? media[hero.posterMediaId] : undefined;
  if (mode === "VIDEO") return video ? { kind: "VIDEO" as const, asset: video, poster } : image ? { kind: "IMAGE" as const, asset: image } : undefined;
  if (mode === "IMAGE") return image ? { kind: "IMAGE" as const, asset: image } : video ? { kind: "VIDEO" as const, asset: video, poster } : undefined;
  if (video) return { kind: "VIDEO" as const, asset: video, poster };
  if (image) return { kind: "IMAGE" as const, asset: image };
  return undefined;
}

export function HomePage({ content }: { content?: HomeContent }) {
  const root = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeService, setActiveService] = useState(0);
  const [proofPosition, setProofPosition] = useState(52);
  const sections = content?.page?.sections;
  const media = useMemo(() => Object.fromEntries(
    Object.entries(content?.media ?? {}).filter(([, asset]) => isRenderablePublicMedia(asset)),
  ), [content?.media]);
  const services = content?.services?.length ? content.services : fallbackServices;
  const faqs = content?.faqs?.length ? content.faqs : fallbackFaqs;
  const allProjects = content?.projects ?? [];
  const hero = { ...defaults.hero, ...section<HeroContent>(sections, "hero") };
  const positioning = { ...defaults.positioning, ...section<{ headline?: string; body?: string; highlight?: string }>(sections, "positioning") };
  const capabilities = section<{ heading?: string; description?: string; serviceIds?: string[] }>(sections, "capabilities");
  const selectedWork = section<{ heading?: string; description?: string; projectIds?: string[] }>(sections, "selectedWork");
  const proof = section<{ heading?: string; rawMediaId?: string; finishedMediaId?: string }>(sections, "beforeAfter");
  const workflow = section<{ heading?: string; description?: string; steps?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "productionWorkflow");
  const why = section<{ heading?: string; description?: string; items?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "whyPicVisual");
  const faqCopy = section<{ heading?: string }>(sections, "faq");
  const cta = section<{ eyebrow?: string; heading?: string; body?: string; cta?: { label?: string; href?: string } }>(sections, "cta");
  const gallerySection = section<{ mediaIds?: string[] }>(sections, "gallery");
  const selectedServices = capabilities?.serviceIds?.length
    ? capabilities.serviceIds.flatMap((id) => services.filter((item) => item.id === id))
    : services;
  const projects = selectedWork?.projectIds?.length
    ? selectedWork.projectIds.flatMap((id) => allProjects.filter((project) => project.id === id))
    : allProjects.filter((project) => project.featured !== false);
  const projectMode = homepageProjectMode(projects.length);
  const resolvedIds = resolvedHomepageMediaIds(sections, media);
  const heroMedia = resolveHeroMedia(hero, media);
  const galleryIds = (gallerySection?.mediaIds || []).filter((id) => media[id]).slice(0, 6);
  const gallerySource = galleryIds.length ? galleryIds.map((id) => media[id]) : demoPortfolio.map((item) => item.asset);
  const proofRaw = proof?.rawMediaId && media[proof.rawMediaId] ? media[proof.rawMediaId] : demoMedia.beautyRaw;
  const proofRefined = proof?.finishedMediaId && media[proof.finishedMediaId] ? media[proof.finishedMediaId] : demoMedia.beautyDetail;
  const proofIsSample = !(proof?.rawMediaId && proof?.finishedMediaId && media[proof.rawMediaId] && media[proof.finishedMediaId]);
  const introAssets: PublicMedia[] = galleryIds.length
    ? galleryIds.slice(0, 4).map((id) => media[id])
    : [demoMedia.beauty, demoMedia.productPolished, demoMedia.gemstone, demoMedia.motion];
  const processAsset: PublicMedia = galleryIds.length > 3 ? media[galleryIds[3]] : demoMedia.workstation;
  const processSupport: PublicMedia[] = galleryIds.length > 5
    ? [media[galleryIds[4]], media[galleryIds[5]]]
    : [demoMedia.productSource, demoMedia.motionSequence];
  const capabilityMedia: PublicMedia[] = galleryIds.length > 2
    ? galleryIds.slice(0, 3).map((id) => media[id])
    : [demoMedia.compositingLayers, demoMedia.productPolished, demoMedia.gemstone];
  const steps = workflow?.steps?.filter((step) => step.enabled !== false) ?? [
    { title: "Send" }, { title: "Prep" }, { title: "Finish" }, { title: "Quality check" }, { title: "Deliver" },
  ];
  const reasons = why?.items?.filter((item) => item.enabled !== false) ?? [
    { title: "Careful visual craft", description: "Attention to tone, texture and the original capture." },
    { title: "Consistent delivery", description: "A shared finish carried across the image set." },
    { title: "Clear collaboration", description: "Briefs, review stages and handoffs agreed together." },
  ];
  const immersiveWorlds = useMemo(() => {
    return (sections || [])
      .filter((item) => IMMERSIVE_TYPES.includes(item.type as typeof IMMERSIVE_TYPES[number]))
      .map((item) => {
        const contentValue = item.content as ImmersiveContent;
        const ids = mediaIdsFrom(item.type, contentValue).filter((id) => media[id]).slice(0, 2);
        return {
          type: item.type,
          label: contentValue.label || item.type.replace(/([A-Z])/g, " $1").toUpperCase(),
          heading: contentValue.heading || item.type,
          description: contentValue.description || "",
          assets: ids.map((id) => media[id]),
          source: "cms" as const,
        };
      });
  }, [sections, media]);
  const mediaSource = resolvedIds.length || heroMedia ? "cms" : "demo";
  const mediaWorlds = immersiveWorlds.filter((world) => world.assets.length > 0);
  const consumedCmsTypes = new Set<string>();
  const fallbackWorlds = demoWorlds.map((demo) => {
    const aliases = demo.type === "creative" ? ["creative", "development"] : [demo.type];
    const cms = mediaWorlds.find((world) => aliases.includes(world.type));
    if (cms) consumedCmsTypes.add(cms.type);
    return cms ?? { ...demo, assets: [...demo.assets], source: "demo" as const };
  });
  const worldsToRender = [...fallbackWorlds, ...mediaWorlds.filter((world) => !consumedCmsTypes.has(world.type))].slice(0, 4);
  const worldFor = (...types: string[]) => worldsToRender.find((world) => types.includes(world.type));
  const servicePanels = [
    { id: "image-post", label: "Image Post", service: selectedServices[0], world: worldFor("imagePost"), fallback: demoMedia.beautyDetail },
    { id: "motion-video", label: "Motion / Video", service: selectedServices[1], world: worldFor("videoEdit", "motion"), fallback: demoMedia.filmFrame },
    { id: "product-jewelry", label: "Product / Jewelry", service: undefined, world: worldFor("product", "jewelry"), fallback: demoMedia.productPolished },
    { id: "creative-cgi", label: "Creative / CGI", service: selectedServices[2], world: worldFor("creative", "development"), fallback: demoMedia.compositingLayers },
  ].map((panel) => {
    const configuredMedia = panel.service?.hero;
    const hasConfiguredMedia = isRenderableImageAsset(configuredMedia);
    return {
      id: panel.service?.id || panel.id,
      title: panel.service?.shortTitle || panel.service?.title || panel.label,
      description: panel.service?.description || panel.world?.description || "A focused PicVisual production capability.",
      asset: (hasConfiguredMedia ? configuredMedia : panel.world?.assets[0] || panel.fallback) as PublicMedia,
      isDemo: !hasConfiguredMedia && panel.world?.source !== "cms",
    };
  });
  const displayedHero = heroMedia ?? { kind: "IMAGE" as const, asset: demoMedia.filmFrame };
  useHomeMotion(root, { mediaMode: "media" });

  return (
    <div ref={root} className="pvh-home pvh-bzm" data-media-mode={mediaSource} data-project-mode={projectMode} data-overlay={hero.overlayStrength || "medium"}>
      <div className="pvh-opening-chapter">
      <section className="pvh-hero has-media">
        <div className="pvh-hero-stage">
          {displayedHero.kind === "VIDEO"
            ? <MediaVideo className="pvh-media pvh-hero-media" src={displayedHero.asset.publicUrl} poster={displayedHero.poster?.publicUrl} label={displayedHero.asset.alt || "PicVisual hero"} decorative autoPlay loop priority />
            : <CmsImage className="pvh-media pvh-hero-media" asset={displayedHero.asset} priority sizes="100vw" />}
          {!heroMedia && <DemoCaption asset={demoMedia.hero} />}
          <div className="pvh-hero-shade" />
        </div>
        <div className="pvh-hero-copy">
          <span className="pvh-kicker">{hero.eyebrow}</span>
          <h1>{headlineLines(hero.headline).map((line, index, lines) => <span key={`${line}-${index}`}>{line}{index < lines.length - 1 ? " " : ""}</span>)}</h1>
          <p>{hero.description}</p>
          <div className="pvh-actions">
            <Link className="pvh-button" href={hero.primaryCta.href || "#selected-work"}>{hero.primaryCta.label} <i>↗</i></Link>
            <Link className="pvh-text-link" href={hero.secondaryCta.href || "/contact"}>{hero.secondaryCta.label} <i>↗</i></Link>
          </div>
        </div>
        <div className="pvh-hero-disciplines" aria-label="PicVisual disciplines">
          <span>IMAGE</span><span>MOTION</span><span>COMMERCE</span><span>CREATIVE</span>
        </div>
        <div className="pvh-scroll-note"><span>SCROLL TO EXPLORE</span><i /></div>
      </section>

      <section className="pvh-intro pvh-section" data-reveal>
        <span className="pvh-index">01 — POSITIONING</span>
        <div className="pvh-intro-grid">
          <h2>{positioning.headline}</h2>
          <div className="pvh-intro-copy">
            {positioning.highlight && <p className="pvh-highlight">{positioning.highlight}</p>}
            <p>{positioning.body}</p>
          </div>
        </div>
        <div className="pvh-intro-collage has-media" data-source={galleryIds.length ? "cms" : "demo"}>
          <strong className="pvh-intro-ghost" aria-hidden="true">REFINED</strong>
          {introAssets.map((asset, index) => (
            <figure className={`pvh-intro-frame intro-frame-${index + 1}`} key={`${asset.publicUrl}-intro-${index}`} data-depth={index === 0 ? "0.06" : index === 1 ? "-0.04" : "0.03"}>
              <MediaAsset asset={asset} />
              {!galleryIds.length && index === 0 && <DemoCaption asset={asset as DemoAsset} />}
            </figure>
          ))}
          <span className="pvh-intro-note">ONE PARTNER / EVERY FRAME</span>
        </div>
      </section>
      </div>

      <section className="pvh-cap-rail" data-reveal>
        <div className="pvh-cap-rail-shell">
          <header className="pvh-cap-rail-header">
            <span className="pvh-index">02 — CAPABILITIES</span>
            <h2>Production breadth without noise.</h2>
            <p>{capabilities?.description || "Image, motion and creative production—one coordinated system for a consistent visual standard."}</p>
          </header>
          <div className="pvh-cap-panels" aria-label="PicVisual capabilities">
            {worldsToRender.map((world, index) => (
              <article key={`${world.type}-${index}`} className={`pvh-cap-panel cap-${world.type}`} data-capability={world.type} data-source={world.source}>
                <figure className="pvh-cap-panel-media">
                  <MediaAsset asset={world.assets[0]} />
                  {world.source === "demo" && <DemoCaption asset={world.assets[0] as DemoAsset} />}
                </figure>
                {world.assets[1] && <figure className="pvh-cap-panel-detail" aria-hidden="true"><MediaAsset asset={world.assets[1]} /></figure>}
                <div className="pvh-cap-panel-copy">
                  <span>{String(index + 1).padStart(2, "0")} / {world.label}</span>
                  <h3>{world.heading}</h3>
                  {world.description && <p>{world.description}</p>}
                </div>
              </article>
            ))}
          </div>
          <div className="pvh-cap-proof" aria-label="Raw and refined comparison">
            <div className="pvh-cap-proof-copy">
              <span className="pvh-index">PROOF / RAW → REFINED</span>
              <h3>{proof?.heading || "Move between source and finish."}</h3>
              <p>Texture, tone and finishing intent remain visible inside the same production canvas.</p>
            </div>
            <figure className={`pvh-proof-stage ${proofIsSample ? "is-sample" : ""}`}>
              <div className="pvh-proof-refined"><MediaAsset asset={proofRefined} /></div>
              <div className="pvh-proof-raw" style={{ clipPath: `inset(0 ${100 - proofPosition}% 0 0)` }}><MediaAsset asset={proofRaw} /></div>
              <span className="pvh-proof-divider" style={{ left: `${proofPosition}%` }} aria-hidden="true"><i>↔</i></span>
              <span className="pvh-proof-label is-raw">RAW</span>
              <span className="pvh-proof-label is-refined">REFINED</span>
              {proofIsSample && <span className="pvh-proof-sample">SAMPLE TREATMENT STUDY</span>}
              <figcaption className="sr-only">A comparison between raw and refined sample treatment states.</figcaption>
              <input
                type="range"
                min="8"
                max="92"
                value={proofPosition}
                onChange={(event) => setProofPosition(Number(event.target.value))}
                aria-label="Compare raw and refined image treatment"
              />
            </figure>
          </div>
          <div className="pvh-cap-progress" aria-hidden="true"><i /></div>
        </div>
      </section>

      <section className="pvh-services pvh-production-chapter pvh-section" data-reveal>
        <div className="pvh-services-scroll">
        <div className="pvh-services-shell">
        <header className="pvh-production-header">
          <span className="pvh-index">03 — SERVICES / PRODUCTION</span>
          <h2>{capabilities?.heading || "Every frame has a finish."}</h2>
          <p>{capabilities?.description || "Image, motion and creative production—one coordinated system for a consistent visual standard."}</p>
        </header>
        <div className="pvh-service-panels" role="group" aria-label="Services">
          {servicePanels.map((service, index) => {
            return (
              <button
                type="button"
                aria-pressed={activeService === index}
                className={`pvh-service-panel ${activeService === index ? "is-active" : ""}`}
                key={service.id}
                onClick={() => setActiveService(index)}
                onFocus={() => setActiveService(index)}
                onMouseEnter={() => setActiveService(index)}
              >
                <figure>
                  <CmsImage asset={service.asset} priority sizes="(max-width: 800px) 100vw, 42vw" />
                  {service.isDemo && <DemoCaption asset={service.asset as DemoAsset} />}
                </figure>
                <span className="pvh-service-panel-copy">
                  <small>{String(index + 1).padStart(2, "0")} / SERVICE</small>
                  <strong>{service.title}</strong>
                  <span>{service.description}</span>
                  <i aria-hidden="true">↗</i>
                </span>
              </button>
            );
          })}
        </div>
        </div>
        </div>
        <div className="pvh-production-flow">
          <div className="pvh-production-flow-copy">
            <span className="pvh-index">WORKFLOW / ONE CONNECTED SYSTEM</span>
            <h3>{workflow?.heading || "Post-production built for modern visual teams."}</h3>
            <p>{workflow?.description || "A clear production path from brief to final delivery."}</p>
            <Link className="pvh-text-link pvh-service-link" href="/services">Explore all services <i>↗</i></Link>
          </div>
          <div className="pvh-process-composition has-media">
            <figure className="pvh-process-media">
              <MediaAsset asset={processAsset} />
              {!galleryIds.length && <DemoCaption asset={processAsset as DemoAsset} />}
            </figure>
            {processSupport.map((asset, index) => (
              <figure className={`pvh-process-support support-${index + 1}`} key={`${asset.publicUrl}-process`}>
                <MediaAsset asset={asset} />
              </figure>
            ))}
          </div>
          <ol className="pvh-process-rail">
            {steps.map((step, index) => (
              <li key={`${step.title}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
                {step.description && <p>{step.description}</p>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="selected-work" className={`pvh-work pvh-section is-${projectMode}`} data-reveal>
        <div className="pvh-work-scroll">
          <div className="pvh-work-shell">
            <header>
              <span className="pvh-index">04 — SELECTED WORK</span>
              <h2>{selectedWork?.heading || "Selected Work"}</h2>
            </header>
            {projectMode === "empty" ? (
              <>
                <div className="pvh-sample-projects pvh-work-mosaic">
                  <div className="pvh-portfolio-stage">
                    {demoPortfolio.map((item, index) => <article className={`pvh-sample-project pvh-work-item sample-${index + 1}`} key={item.title}>
                      <figure><CmsImage asset={item.asset} sizes="(max-width: 800px) 100vw, 62vw" /></figure>
                      <div><span>{String(index + 1).padStart(2, "0")} / {item.category} · {item.scope}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
                    </article>)}
                  </div>
                </div>
                <div className="pvh-sample-note"><p>{selectedWork?.description || "A continuously evolving sample project canvas. Published CMS projects replace these concepts automatically."}</p><Link className="pvh-text-link" href="/contact">Start a Project <i>↗</i></Link></div>
              </>
            ) : (
              <div className="pvh-projects pvh-work-mosaic">{projects.slice(0, 5).map((project, index) => <ProjectCard key={project.slug} project={project} index={index} />)}</div>
            )}
          </div>
        </div>

        <div className="pvh-work-resolution pvh-gallery has-media" data-source={galleryIds.length ? "cms" : "demo"}>
          <header>
            <span className="pvh-index">PROJECT CANVAS / {galleryIds.length ? "GALLERY" : "DETAIL STUDY"}</span>
            <h2>Selected Work, in detail.</h2>
            <p>One evolving project canvas across product, fashion, beauty and motion.</p>
          </header>
          <div className="pvh-gallery-stage">
            {gallerySource.slice(0, 6).map((asset, index) => (
              <figure key={`${asset.publicUrl}-${index}`} className={`pvh-gallery-frame frame-${index + 1}`}>
                <MediaAsset asset={asset} />
              </figure>
            ))}
            <strong className="pvh-gallery-mark" data-depth="0.1" aria-hidden="true">PV</strong>
          </div>
        </div>
      </section>

      <div className="pvh-closing-chapter">
      <section className="pvh-why pvh-section" data-reveal>
        <div className="pvh-trust-opening">
          <div>
            <header>
              <span className="pvh-index">05 — TRUST / CONVERSION</span>
              <h2>Production breadth without noise.</h2>
            </header>
            <ul className="pvh-chip-rail">{capabilityChips.map((chip) => <li key={chip}>{chip}</li>)}</ul>
          </div>
          <div className="pvh-capability-media has-media">
            {capabilityMedia.map((asset, index) => (
              <figure className={`capability-frame-${index + 1}`} key={`${asset.publicUrl}-capability`}>
                <MediaAsset asset={asset} />
              </figure>
            ))}
          </div>
        </div>
        <div className="pvh-trust-core">
          <header>
            <span className="pvh-index">WHY PICVISUAL</span>
            <h2>{why?.heading || "Built for visual production at scale."}</h2>
            {why?.description && <p>{why.description}</p>}
          </header>
          <figure className="pvh-why-anchor" aria-hidden="true"><CmsImage asset={demoMedia.compositingLayers} sizes="(max-width: 800px) 92vw, 48vw" /></figure>
          <div className="pvh-why-grid">
            {reasons.map((item, index) => (
              <article key={`${item.title}-${index}`}>
                <figure className="pvh-trust-fragment" aria-hidden="true"><CmsImage asset={[demoMedia.productMaterial, demoMedia.workstation, demoMedia.motionSequence][index % 3]} sizes="(max-width: 800px) 100vw, 32vw" /></figure>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <figure className="pvh-why-media-clean" data-depth="0.08" aria-hidden="true"><CmsImage asset={demoMedia.productMaterial} sizes="(max-width: 800px) 100vw, 88vw" /></figure>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="pvh-faq pvh-section" data-reveal>
          <header>
            <span className="pvh-index">FAQ</span>
            <h2>{faqCopy?.heading || "Good work starts clear."}</h2>
            <figure className="pvh-faq-media"><CmsImage asset={demoMedia.motionSequence} sizes="(max-width: 800px) 100vw, 36vw" /></figure>
          </header>
          <div className="pvh-faq-list">
            {faqs.map(([question, answer], index) => (
              <article className={openFaq === index ? "is-open" : ""} key={question}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`home-faq-${index}`}>
                  <span>{question}</span><i>+</i>
                </button>
                <div id={`home-faq-${index}`} aria-hidden={openFaq !== index}><p>{answer}</p></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="pvh-cta pvh-section" data-reveal>
        <figure className="pvh-cta-media" data-depth="-0.06" aria-hidden="true"><CmsImage asset={demoMedia.compositingLayers} sizes="100vw" /></figure>
        <div className="pvh-cta-copy">
          <span className="pvh-index">{cta?.eyebrow || "START A CONVERSATION"}</span>
          <h2>{cta?.heading || "Have content in production?"}</h2>
          <p>{cta?.body || "Let’s make it ready for market."}</p>
          <div className="pvh-actions">
            <Link className="pvh-button" href={cta?.cta?.href || "/contact"}>{cta?.cta?.label || "Start a Project"} <i>↗</i></Link>
            <Link className="pvh-text-link" href="/work">View Selected Work <i>↗</i></Link>
          </div>
        </div>
        <span className="pvh-cta-mark" aria-hidden="true">PV</span>
      </section>
      </div>
    </div>
  );
}
