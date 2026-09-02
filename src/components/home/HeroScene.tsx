"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type HeroContent = { eyebrow: string; headline: string; description: string; primaryCta: { label: string; href: string }; secondaryCta?: { label: string; href: string } };
const fallbackHero: HeroContent = { eyebrow: "IMAGE • VIDEO • E-COMMERCE POST", headline: "From raw capture to campaign-ready.", description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion — with the consistency modern content teams need.", primaryCta: { label: "View Selected Work", href: "/work" }, secondaryCta: { label: "Start a Test Project", href: "/contact" } };

export function HeroScene({ content = fallbackHero }: { content?: HeroContent }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const layers = gsap.utils.toArray<HTMLElement>("[data-depth]");
    const quickX = layers.map((layer) => gsap.quickTo(layer, "x", { duration: 1.2, ease: "power3.out" }));
    const quickY = layers.map((layer) => gsap.quickTo(layer, "y", { duration: 1.2, ease: "power3.out" }));
    const onMove = (event: PointerEvent) => { const x = event.clientX / window.innerWidth - .5; const y = event.clientY / window.innerHeight - .5; layers.forEach((layer, index) => { const depth = Number(layer.dataset.depth) || index + 1; quickX[index](x * depth * 9); quickY[index](y * depth * 7); }); };
    window.addEventListener("pointermove", onMove, { passive: true });
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", { y: 34, opacity: 0, duration: 1.1, stagger: .12, ease: "power3.out", delay: .15 });
      gsap.from(".hero-plane", { scale: .9, opacity: 0, duration: 1.5, stagger: .1, ease: "power3.out" });
    }, root);
    return () => { window.removeEventListener("pointermove", onMove); ctx.revert(); };
  }, { scope: root });
  return <section className="hero" ref={root}>
    <div className="hero-noise" /><div className="hero-grid" />
    <div className="hero-copy"><span className="eyebrow">{content.eyebrow}</span><h1>{content.headline}</h1><p>{content.description}</p><div className="hero-actions"><Link className="button button-light" href={content.primaryCta.href}>{content.primaryCta.label} <i>↗</i></Link>{content.secondaryCta && <Link className="text-link" href={content.secondaryCta.href}>{content.secondaryCta.label} <i>↗</i></Link>}</div></div>
    <div className="hero-stage" aria-hidden="true">
      <div className="hero-plane hero-back" data-depth=".4"><span>CONDITION / LIGHT</span></div>
      <div className="hero-plane hero-mid" data-depth="1.1"><div className="hero-silhouette" /><span className="frame-note">RETOUCH LAYER — 02</span></div>
      <div className="hero-plane hero-front" data-depth="1.8"><div className="hero-product" /><div className="hero-reflection" /><span>FINAL / 1080 × 1350</span></div>
      <div className="hero-crop crop-one" data-depth="2.2">+ 48.2</div><div className="hero-crop crop-two" data-depth="1.4">PV / 01</div>
    </div>
    <div className="hero-foot"><span>SCROLL TO EXPLORE</span><div className="scroll-line" /><span>© PICVISUAL</span></div>
  </section>;
}
