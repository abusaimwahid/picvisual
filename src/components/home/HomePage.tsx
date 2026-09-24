"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { caseStudyHref } from "@/cms/case-studies";
import type { Project, PublicAsset } from "@/content/work";
import { services as fallbackServices, type Service } from "@/content/services";
import { faqs as fallbackFaqs } from "@/content/faq";
import { demoGallery, demoMedia, demoPortfolio, demoServiceMedia, demoWorlds, type DemoAsset } from "@/content/demo-media";
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
  backgroundMediaId?: string; subjectMediaId?: string; detailMediaIds?: string[];
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

const sceneBeats: Record<string, string[]> = {
  imagePost: ["RAW", "DETAIL", "FINAL"],
  product: ["SOURCE", "CLEANUP", "POLISHED"],
  jewelry: ["MACRO", "LIGHT", "FINISH"],
  videoEdit: ["CUT", "GRADE", "DELIVER"],
  motion: ["FRAME 01", "FRAME 12", "FRAME 24"],
  creative: ["LAYERS", "ALIGN", "COMPOSITE"],
  development: ["LAYERS", "ALIGN", "COMPOSITE"],
};

function section<T>(sections: HomepageSection[] | undefined, type: string): T | undefined {
  const value = sections?.find((item) => item.type === type)?.content;
  return value && typeof value === "object" ? value as T : undefined;
}

function headlineLines(value: string) {
  if (value.includes("\n")) return value.split("\n").filter(Boolean);
  if (value.trim().toLowerCase() === "from raw capture to campaign-ready.") return ["From raw capture", "to campaign-ready."];
  return [value];
}

function mediaIdsFrom(content: ImmersiveContent | undefined) {
  if (!content) return [] as string[];
  const ids: string[] = [];
  const push = (value?: string | string[]) => {
    if (!value) return;
    if (Array.isArray(value)) value.forEach((id) => id && ids.push(id));
    else ids.push(value);
  };
  push(content.primaryMediaId); push(content.secondaryMediaId); push(content.tertiaryMediaId);
  push(content.rawMediaId); push(content.finishedMediaId); push(content.videoMediaId);
  push(content.finalFrameMediaId); push(content.sourceMediaId); push(content.cutoutMediaId);
  push(content.finalMediaId); push(content.campaignMediaId); push(content.macroMediaId);
  push(content.supportingMediaId); push(content.backgroundMediaId); push(content.subjectMediaId);
  push(content.mobileMediaId); push(content.posterMediaId);
  push(content.detailMediaIds); push(content.timelineMediaIds); push(content.reelMediaIds); push(content.posterMediaIds);
  return [...new Set(ids)];
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
    <Link href={caseStudyHref(project)} className="pvh-project">
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
  const gallerySource = galleryIds.length ? galleryIds.map((id) => media[id]) : [...demoGallery];
  const proofRaw = proof?.rawMediaId && media[proof.rawMediaId] ? media[proof.rawMediaId] : demoMedia.beauty;
  const proofRefined = proof?.finishedMediaId && media[proof.finishedMediaId] ? media[proof.finishedMediaId] : demoMedia.beauty;
  const proofIsSample = !(proof?.rawMediaId && proof?.finishedMediaId && media[proof.rawMediaId] && media[proof.finishedMediaId]);
  const introAssets: PublicMedia[] = galleryIds.length
    ? galleryIds.slice(0, 3).map((id) => media[id])
    : [demoMedia.beauty, demoMedia.jewelry, demoMedia.product];
  const processAsset: PublicMedia = galleryIds.length > 3 ? media[galleryIds[3]] : demoMedia.motion;
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
        const ids = mediaIdsFrom(contentValue).filter((id) => media[id]).slice(0, 3);
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
  const worldsToRender = [...fallbackWorlds, ...mediaWorlds.filter((world) => !consumedCmsTypes.has(world.type))].slice(0, 6);
  const displayedHero = heroMedia ?? { kind: "IMAGE" as const, asset: demoMedia.hero };
  useHomeMotion(root, { mediaMode: "media" });

  return (
    <div ref={root} className="pvh-home" data-media-mode={mediaSource} data-project-mode={projectMode} data-overlay={hero.overlayStrength || "medium"}>
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

      {worldsToRender.map((world, index) => (
        <section key={`${world.type}-${index}`} className={`pvh-world pvh-section has-media world-${world.type} world-${index + 1}`} data-has-media="true" data-source={world.source} data-reveal>
          <div className="pvh-world-copy">
            <span className="pvh-index">{String(index + 2).padStart(2, "0")} — {world.label}</span>
            <h2 className="pvh-world-title">{world.heading}</h2>
            {world.description && <p>{world.description}</p>}
          </div>
          <div className="pvh-world-stage">
            {world.assets.map((asset, planeIndex) => (
              <figure key={`${asset.publicUrl}-${planeIndex}`} className={`pvh-plane pvh-plane-${planeIndex + 1}`}>
                <MediaAsset asset={asset} />
                {world.source === "demo" && planeIndex === 0 && <DemoCaption asset={asset as DemoAsset} />}
              </figure>
            ))}
            {world.type === "videoEdit" && <div className="pvh-editing-ui" aria-hidden="true">
              <span className="pvh-scope"><i /><i /><i /><i /><i /></span>
              <span className="pvh-edit-time">00:18:24</span>
              <span className="pvh-edit-track"><i /><i /><i /><i /><i /><i /><i /><i /></span>
            </div>}
            {world.type === "motion" && <div className="pvh-motion-ui" aria-hidden="true">
              <span>FRAME 01</span><i /><i /><i /><i /><i /><i /><i /><i /><span>FRAME 24</span>
              <svg viewBox="0 0 160 54" role="presentation"><path d="M2 50 C38 50 35 5 78 25 S122 4 158 3" /></svg>
            </div>}
            {(world.type === "creative" || world.type === "development") && <div className="pvh-compose-ui" aria-hidden="true"><span>SUBJECT</span><span>LIGHT</span><span>TEXTURE</span><i /></div>}
            <div className="pvh-scene-progress" aria-hidden="true">
              <i />
              {(sceneBeats[world.type] || ["SOURCE", "CRAFT", "FINAL"]).map((beat) => <span key={beat}>{beat}</span>)}
            </div>
          </div>
        </section>
      ))}

      <section className="pvh-proof pvh-section" data-reveal>
        <header>
          <span className="pvh-index">PROOF / RAW → REFINED</span>
          <h2>{proof?.heading || "Move between source and finish."}</h2>
          <p>Inspect the tonal control, texture and finishing intent directly.</p>
        </header>
        <figure className={`pvh-proof-stage ${proofIsSample ? "is-sample" : ""}`}>
          <div className="pvh-proof-refined"><MediaAsset asset={proofRefined} /></div>
          <div className="pvh-proof-raw" style={{ clipPath: `inset(0 ${100 - proofPosition}% 0 0)` }}><MediaAsset asset={proofRaw} /></div>
          <span className="pvh-proof-divider" style={{ left: `${proofPosition}%` }} aria-hidden="true"><i>↔</i></span>
          <span className="pvh-proof-label is-raw">RAW</span>
          <span className="pvh-proof-label is-refined">REFINED</span>
          {proofIsSample && <span className="pvh-proof-sample">SAMPLE TREATMENT STUDY / NO CLIENT ATTRIBUTION</span>}
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
      </section>

      <section className="pvh-process pvh-section" data-reveal>
        <header>
          <span className="pvh-index">WORKFLOW</span>
          <h2>{workflow?.heading || "Post-production built for modern visual teams."}</h2>
          <p>{workflow?.description || "A clear production path from brief to final delivery."}</p>
        </header>
        <figure className="pvh-process-media has-media">
          <MediaAsset asset={processAsset} />
          {!galleryIds.length && <DemoCaption asset={processAsset as DemoAsset} />}
          <figcaption><span>BRIEF</span><i /><span>DELIVERY</span></figcaption>
        </figure>
        <ol className="pvh-process-rail">
          {steps.map((step, index) => (
            <li key={`${step.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              {step.description && <p>{step.description}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="pvh-services pvh-section" data-reveal>
        <header>
          <span className="pvh-index">SERVICES</span>
          <h2>{capabilities?.heading || "Every frame has a finish."}</h2>
          <p>{capabilities?.description || "Image, motion and creative production—one coordinated system for a consistent visual standard."}</p>
        </header>
        <div className="pvh-service-experience">
          <div className="pvh-service-rows" role="tablist" aria-label="Services">
            {selectedServices.map((service, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeService === index}
                aria-controls={`service-visual-${index}`}
                className={`pvh-service-row3d ${activeService === index ? "is-active" : ""}`}
                key={service.id || service.title}
                onClick={() => setActiveService(index)}
                onFocus={() => setActiveService(index)}
                onMouseEnter={() => setActiveService(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className="pvh-service-row-copy"><strong>{service.title}</strong><small>{service.description}</small></span>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
            <Link className="pvh-text-link pvh-service-link" href="/services">Explore all services <i>↗</i></Link>
          </div>
          <div className="pvh-service-visual-stage has-media">
            {selectedServices.map((service, index) => {
              const hasServiceMedia = isRenderableImageAsset(service.hero);
              const serviceMedia = hasServiceMedia ? service.hero! : demoServiceMedia[index % demoServiceMedia.length];
              return (
                <figure
                  id={`service-visual-${index}`}
                  role="tabpanel"
                  aria-hidden={activeService !== index}
                  className={`pvh-service-visual ${activeService === index ? "is-active" : ""}`}
                  key={`${service.id || service.title}-visual`}
                >
                  <CmsImage asset={serviceMedia} priority sizes="(max-width: 800px) 100vw, 48vw" />
                  {!hasServiceMedia && <DemoCaption asset={serviceMedia as DemoAsset} />}
                  <figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{service.shortTitle || service.title}</strong></figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      <section id="selected-work" className={`pvh-work pvh-section is-${projectMode}`} data-reveal>
        <header>
          <span className="pvh-index">SELECTED WORK</span>
          <h2>{selectedWork?.heading || "Selected Work"}</h2>
        </header>
        {projectMode === "empty" ? (
          <div className="pvh-sample-projects">
            {demoPortfolio.map((item, index) => <article className={`pvh-sample-project sample-${index + 1}`} key={item.title}>
              <figure><CmsImage asset={item.asset} priority sizes="(max-width: 800px) 100vw, 55vw" /><DemoCaption asset={item.asset} /></figure>
              <div><span>{item.category} · {item.scope}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
            </article>)}
            <div className="pvh-sample-note"><p>{selectedWork?.description || "These sample concepts demonstrate the presentation system. Published CMS projects replace them automatically."}</p><Link className="pvh-text-link" href="/contact">Start a Project <i>↗</i></Link></div>
          </div>
        ) : (
          <div className="pvh-projects">{projects.slice(0, 5).map((project, index) => <ProjectCard key={project.slug} project={project} index={index} />)}</div>
        )}
      </section>

      <section className="pvh-gallery pvh-section has-media" data-source={galleryIds.length ? "cms" : "demo"} data-reveal>
          <header>
            <span className="pvh-index">{galleryIds.length ? "GALLERY" : "SAMPLE VISUAL STUDY"}</span>
            <h2>{galleryIds.length ? "Selected Project Gallery." : "A closer look at the finish."}</h2>
            <p>{galleryIds.length ? "A closer look at finishing decisions across product, fashion, beauty and motion." : "An unbranded presentation of finishing decisions across product, fashion, beauty and motion."}</p>
          </header>
          <div className="pvh-gallery-stage">
            {gallerySource.slice(0, 6).map((asset, index) => (
              <figure key={`${asset.publicUrl}-${index}`} className={`pvh-gallery-frame frame-${index + 1}`}>
                <MediaAsset asset={asset} />
              </figure>
            ))}
            <strong className="pvh-gallery-mark" data-depth="0.1">PV</strong>
          </div>
        </section>

      <section className="pvh-capabilities pvh-section" data-reveal>
        <header>
          <span className="pvh-index">CAPABILITIES</span>
          <h2>Production breadth without noise.</h2>
        </header>
        <ul className="pvh-chip-rail">{capabilityChips.map((chip) => <li key={chip}>{chip}</li>)}</ul>
      </section>

      <section className="pvh-why pvh-section" data-reveal>
        <header>
          <span className="pvh-index">WHY PICVISUAL</span>
          <h2>{why?.heading || "Built for visual production at scale."}</h2>
          {why?.description && <p>{why.description}</p>}
        </header>
        <div className="pvh-why-grid">
          {reasons.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
        <div className="pvh-why-signal" aria-hidden="true">
          <span>CONSISTENCY / EVERY ASSET</span><span>CAPACITY / WHEN NEEDED</span><span>DELIVERY / PRODUCTION READY</span>
          <strong>CONTROL<br />AT SCALE</strong><i />
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="pvh-faq pvh-section" data-reveal>
          <header>
            <span className="pvh-index">FAQ</span>
            <h2>{faqCopy?.heading || "Good work starts clear."}</h2>
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
        <div>
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
  );
}
