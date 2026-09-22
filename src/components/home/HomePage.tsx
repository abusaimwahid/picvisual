"use client";

import Link from "next/link";
import { useState } from "react";
import { caseStudyHref } from "@/cms/case-studies";
import type { Project, PublicAsset } from "@/content/work";
import { services as fallbackServices, type Service } from "@/content/services";
import { faqs as fallbackFaqs } from "@/content/faq";
import { CmsImage } from "@/components/ui/CmsImage";
import { MediaVideo } from "@/components/ui/MediaVideo";
import { homepageProjectMode, resolvedHomepageMediaIds, type HomepageSection } from "./homepage-model";

type PublicMedia = PublicAsset & { mediaType?: string };
type HomeContent = {
  services: Service[];
  projects: Project[];
  faqs: [string, string][];
  page?: { sections: HomepageSection[] };
  media?: Record<string, PublicMedia>;
};
type HeroContent = {
  eyebrow?: string;
  headline?: string;
  description?: string;
  primaryCta?: { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
  primaryMediaId?: string;
  backgroundMediaId?: string;
  mobileMediaId?: string;
  videoMediaId?: string;
};

const defaults = {
  hero: {
    eyebrow: "IMAGE • VIDEO • E-COMMERCE POST",
    headline: "From raw capture to campaign-ready.",
    description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion — with the consistency modern content teams need.",
    primaryCta: { label: "View Selected Work", href: "#selected-work" },
    secondaryCta: { label: "Start a Test Project", href: "/contact" },
  },
  positioning: {
    headline: "Your production partner after the shoot.",
    body: "From high-volume e-commerce catalogs to campaign imagery and short-form motion, PicVisual gives brands one post-production partner for visual consistency across every channel.",
  },
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

function MediaAsset({ asset, priority = false }: { asset: PublicMedia; priority?: boolean }) {
  return asset.mediaType === "VIDEO"
    ? <MediaVideo className="pvh-media" src={asset.publicUrl} label={asset.alt || "PicVisual motion work"} />
    : <CmsImage className="pvh-media" asset={asset} priority={priority} sizes="(max-width: 760px) 100vw, 60vw" />;
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const asset = project.thumbnail ?? project.hero;
  return <Link href={caseStudyHref(project)} className="pvh-project">
    <div className={`pvh-project-visual ${asset ? "has-media" : "is-typographic"}`}>
      {asset ? <CmsImage asset={asset} priority={index === 0} sizes="(max-width: 760px) 100vw, 50vw" /> : <><span>PROJECT / {String(index + 1).padStart(2, "0")}</span><strong>{project.title}</strong></>}
    </div>
    <div className="pvh-project-copy"><span>{project.category} · {project.scope}</span><h3>{project.title}</h3><p>{project.summary}</p><b>{project.isCaseStudy ? "View Case Study" : "View Project"} ↗</b></div>
  </Link>;
}

export function HomePage({ content }: { content?: HomeContent }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sections = content?.page?.sections;
  const media = content?.media ?? {};
  const services = content?.services?.length ? content.services : fallbackServices;
  const faqs = content?.faqs?.length ? content.faqs : fallbackFaqs;
  const allProjects = content?.projects ?? [];
  const hero = { ...defaults.hero, ...section<HeroContent>(sections, "hero") };
  const positioning = { ...defaults.positioning, ...section<{ headline?: string; body?: string }>(sections, "positioning") };
  const capabilities = section<{ heading?: string; description?: string; serviceIds?: string[] }>(sections, "capabilities");
  const selectedWork = section<{ heading?: string; description?: string; projectIds?: string[] }>(sections, "selectedWork");
  const workflow = section<{ heading?: string; description?: string; steps?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "productionWorkflow");
  const why = section<{ heading?: string; description?: string; items?: Array<{ title: string; description?: string; enabled?: boolean }> }>(sections, "whyPicVisual");
  const faqCopy = section<{ heading?: string }>(sections, "faq");
  const cta = section<{ eyebrow?: string; heading?: string; body?: string; cta?: { label?: string; href?: string } }>(sections, "cta");
  const selectedServices = capabilities?.serviceIds?.length ? capabilities.serviceIds.flatMap((id) => services.filter((item) => item.id === id)) : services;
  const projects = selectedWork?.projectIds?.length ? selectedWork.projectIds.flatMap((id) => allProjects.filter((project) => project.id === id)) : allProjects.filter((project) => project.featured !== false);
  const projectMode = homepageProjectMode(projects.length);
  const resolvedIds = resolvedHomepageMediaIds(sections, media);
  const heroMediaId = [hero.videoMediaId, hero.primaryMediaId, hero.backgroundMediaId, hero.mobileMediaId].find((id) => id && media[id]);
  const showcaseIds = resolvedIds.filter((id) => id !== heroMediaId).slice(0, 6);
  const steps = workflow?.steps?.filter((step) => step.enabled !== false) ?? [
    { title: "Send" }, { title: "Prep" }, { title: "Finish" }, { title: "Quality check" }, { title: "Deliver" },
  ];
  const reasons = why?.items?.filter((item) => item.enabled !== false) ?? [
    { title: "Careful visual craft", description: "Attention to tone, texture and the original capture." },
    { title: "Consistent delivery", description: "A shared finish carried across the image set." },
    { title: "Clear collaboration", description: "Briefs, review stages and handoffs agreed together." },
  ];

  return <div className="pvh-home" data-media-mode={resolvedIds.length ? "media" : "empty"} data-project-mode={projectMode}>
    <section className={`pvh-hero ${heroMediaId ? "has-media" : "is-editorial"}`}>
      <div className="pvh-hero-grid" aria-hidden="true" />
      <div className="pvh-hero-copy">
        <span className="pvh-kicker">{hero.eyebrow}</span>
        <h1>{headlineLines(hero.headline).map((line, index, lines) => <span key={`${line}-${index}`}>{line}{index < lines.length - 1 ? " " : ""}</span>)}</h1>
        <p>{hero.description}</p>
        <div className="pvh-actions"><Link className="pvh-button" href={hero.primaryCta.href || "#selected-work"}>{hero.primaryCta.label} <i>↗</i></Link><Link className="pvh-text-link" href={hero.secondaryCta.href || "/contact"}>{hero.secondaryCta.label} <i>↗</i></Link></div>
      </div>
      <div className="pvh-hero-visual" aria-label={heroMediaId ? undefined : "PicVisual visual system"}>
        {heroMediaId ? <MediaAsset asset={media[heroMediaId]} priority /> : <><div className="pvh-hero-word"><span>RAW</span><span>READY</span></div><div className="pvh-hero-axis"><i /><b>01 / CRAFT</b><b>02 / CONSISTENCY</b><b>03 / DELIVERY</b></div><span className="pvh-crop pvh-crop-a">PV / 01</span><span className="pvh-crop pvh-crop-b">+ 48.2</span></>}
      </div>
      <div className="pvh-scroll-note"><span>SCROLL TO EXPLORE</span><i /></div>
    </section>

    <section className="pvh-intro pvh-section">
      <span className="pvh-index">01 — POSITIONING</span>
      <div><h2>{positioning.headline}</h2><p>{positioning.body}</p></div>
    </section>

    <section className="pvh-services pvh-section">
      <header><span className="pvh-index">02 — CAPABILITIES</span><h2>{capabilities?.heading || "Every frame has a finish."}</h2><p>{capabilities?.description || "Image, motion and creative production—one coordinated system for a consistent visual standard."}</p></header>
      <div className="pvh-service-list">{selectedServices.map((service, index) => <article key={service.id || service.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{service.title}</h3><p>{service.description}</p></div><ul>{service.items.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul><i aria-hidden="true">↗</i></article>)}</div>
    </section>

    <section className={`pvh-craft pvh-section ${showcaseIds.length ? "has-media" : "is-editorial"}`}>
      <div className="pvh-craft-copy"><span className="pvh-index">03 — POST-PRODUCTION</span><h2>A considered finish.<br /><em>A consistent visual standard.</em></h2><p>Precision lives in the invisible decisions: tone, texture, edge, light and the consistency that makes a visual system feel whole.</p></div>
      {showcaseIds.length ? <div className="pvh-showcase">{showcaseIds.map((id, index) => <figure key={id}><MediaAsset asset={media[id]} /><figcaption>{String(index + 1).padStart(2, "0")} / APPROVED MEDIA</figcaption></figure>)}</div> : <div className="pvh-signal" aria-hidden="true"><div className="pvh-signal-field"><span>LIGHT</span><span>TEXTURE</span><span>COLOUR</span><span>DETAIL</span><i /><i /><b>PV</b></div><p>RAW → REFINED</p></div>}
    </section>

    <section className="pvh-process pvh-section">
      <header><span className="pvh-index">04 — PROCESS</span><h2>{workflow?.heading || "Built for visual production at scale."}</h2><p>{workflow?.description || "A clear production path from brief to final delivery."}</p></header>
      <ol>{steps.map((step, index) => <li key={`${step.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong>{step.description && <p>{step.description}</p>}</li>)}</ol>
    </section>

    <section id="selected-work" className={`pvh-work pvh-section is-${projectMode}`}>
      <header><span className="pvh-index">05 — SELECTED WORK</span><h2>{selectedWork?.heading || "Selected Work"}</h2></header>
      {projectMode === "empty" ? <div className="pvh-work-empty"><p>{selectedWork?.description || "New work will appear here as projects are published."}</p><Link className="pvh-text-link" href="/contact">Start a Project <i>↗</i></Link></div> : <div className="pvh-projects">{projects.slice(0, 5).map((project, index) => <ProjectCard key={project.slug} project={project} index={index} />)}</div>}
    </section>

    <section className="pvh-why pvh-section">
      <header><span className="pvh-index">06 — WHY PICVISUAL</span><h2>{why?.heading || "Built for teams that ship content every day."}</h2>{why?.description && <p>{why.description}</p>}</header>
      <div>{reasons.map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
    </section>

    {faqs.length > 0 && <section className="pvh-faq pvh-section">
      <header><span className="pvh-index">07 — FAQ</span><h2>{faqCopy?.heading || "Good work starts clear."}</h2></header>
      <div className="pvh-faq-list">{faqs.map(([question, answer], index) => <article className={openFaq === index ? "is-open" : ""} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`home-faq-${index}`}><span>{question}</span><i>+</i></button><div id={`home-faq-${index}`} aria-hidden={openFaq !== index}><p>{answer}</p></div></article>)}</div>
    </section>}

    <section className="pvh-cta pvh-section">
      <div><span className="pvh-index">{cta?.eyebrow || "START A CONVERSATION"}</span><h2>{cta?.heading || "Have content in production?"}</h2><p>{cta?.body || "Let's make it ready for market."}</p><div className="pvh-actions"><Link className="pvh-button" href={cta?.cta?.href || "/contact"}>{cta?.cta?.label || "Start a Project"} <i>↗</i></Link><Link className="pvh-text-link" href="/work">View Selected Work <i>↗</i></Link></div></div><span className="pvh-cta-mark" aria-hidden="true">PV</span>
    </section>
  </div>;
}
