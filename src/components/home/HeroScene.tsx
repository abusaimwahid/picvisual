"use client";

import Link from "next/link";
import { MediaVideo } from "@/components/ui/MediaVideo";
import { CmsImage } from "@/components/ui/CmsImage";
import type { PublicAsset } from "@/content/work";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type HeroContent = { secondaryHeadline?: string; primaryMediaId?: string; secondaryMediaId?: string; backgroundMediaId?: string; mobileMediaId?: string; videoMediaId?: string; posterMediaId?: string; motionPreset?: string; motionIntensity?: string; eyebrow: string; headline: string; description: string; primaryCta: { label: string; href: string }; secondaryCta?: { label: string; href: string } };
const fallbackHero: HeroContent = { eyebrow: "IMAGE • VIDEO • E-COMMERCE POST", headline: "From raw capture to campaign-ready.", description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion — with the consistency modern content teams need.", primaryCta: { label: "View Selected Work", href: "/work" }, secondaryCta: { label: "Start a Test Project", href: "/contact" } };

export function HeroScene({ content = fallbackHero, media = {} }: { content?: HeroContent; media?: Record<string, Omit<PublicAsset, "alt"> & { alt?: string | null }> }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || window.matchMedia("(pointer:coarse)").matches) return;
    const layers = gsap.utils.toArray<HTMLElement>("[data-depth]");
    const quickX = layers.map((layer) => gsap.quickTo(layer, "x", { duration: 1.2, ease: "power3.out" }));
    const quickY = layers.map((layer) => gsap.quickTo(layer, "y", { duration: 1.2, ease: "power3.out" }));
    const onMove = (event: PointerEvent) => { const x = event.clientX / window.innerWidth - .5; const y = event.clientY / window.innerHeight - .5; layers.forEach((layer, index) => { const intensity = content.motionIntensity === "low" ? .5 : content.motionIntensity === "high" ? 1.25 : 1; const depth = (Number(layer.dataset.depth) || index + 1) * intensity; quickX[index](x * depth * 9); quickY[index](y * depth * 7); }); };
    window.addEventListener("pointermove", onMove, { passive: true });
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", { y: 34, opacity: 0, duration: content.motionPreset === "subtle" ? .5 : 1.1, stagger: .08, ease: "power3.out", delay: .15 });
      gsap.from(".hero-plane", { scale: .9, opacity: 0, duration: 1.5, stagger: .1, ease: "power3.out" });
    }, root);
    return () => { window.removeEventListener("pointermove", onMove); ctx.revert(); };
  }, { scope: root, dependencies: [content.motionPreset, content.motionIntensity] });
  return <section className="hero" ref={root}>
    {content.backgroundMediaId && media[content.backgroundMediaId] && <div className="hero-background-media"><CmsImage asset={{ ...media[content.backgroundMediaId], alt: "" }} /></div>}<div className="hero-noise" /><div className="hero-grid" />
    <div className="hero-copy"><span className="eyebrow">{content.eyebrow}</span><h1>{content.headline}{content.secondaryHeadline && <span className="hero-secondary-heading">{content.secondaryHeadline}</span>}</h1><p>{content.description}</p><div className="hero-actions"><Link className="button button-light" href={content.primaryCta.href}>{content.primaryCta.label} <i>↗</i></Link>{content.secondaryCta && <Link className="text-link" href={content.secondaryCta.href}>{content.secondaryCta.label} <i>↗</i></Link>}</div></div>
    {content.mobileMediaId && media[content.mobileMediaId] && <div className="hero-mobile-media"><CmsImage asset={{ ...media[content.mobileMediaId], alt: "" }} /></div>}<div className="hero-stage" aria-hidden="true">
      <div className="hero-plane hero-back" data-depth=".4"><span>CONDITION / LIGHT</span></div>
      <div className="hero-plane hero-mid" data-depth="1.1">{content.secondaryMediaId && media[content.secondaryMediaId] ? <CmsImage asset={{ ...media[content.secondaryMediaId], alt: "" }} priority sizes="(max-width: 800px) 78vw, 34vw" /> : <div className="hero-silhouette" />}<span className="frame-note">RETOUCH LAYER — 02</span></div>
      <div className="hero-plane hero-front" data-depth="1.8">{content.videoMediaId && media[content.videoMediaId] && <MediaVideo src={media[content.videoMediaId].publicUrl} poster={content.posterMediaId ? media[content.posterMediaId]?.publicUrl : undefined} decorative />}{content.primaryMediaId && media[content.primaryMediaId] ? <CmsImage asset={{ ...media[content.primaryMediaId], alt: "" }} priority sizes="(max-width: 800px) 58vw, 25vw" /> : <><div className="hero-product" /><div className="hero-reflection" /></>}<span>FINAL / 1080 × 1350</span></div>
      <div className="hero-crop crop-one" data-depth="2.2">+ 48.2</div><div className="hero-crop crop-two" data-depth="1.4">PV / 01</div>
    </div>
    <div className="hero-foot"><span>SCROLL TO EXPLORE</span><div className="scroll-line" /><span>© PICVISUAL</span></div>
  </section>;
}
