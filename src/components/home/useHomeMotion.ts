"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Options = { enabled?: boolean; mediaMode?: "empty" | "media" };
type WorkState = { x: number; y: number; w: number; h: number; opacity: number };

const workStates: WorkState[][] = [
  [
    { x: 0, y: 10, w: 34, h: 84, opacity: 1 }, { x: 36, y: 0, w: 29, h: 72, opacity: .92 },
    { x: 67, y: 57, w: 29, h: 39, opacity: .82 }, { x: -14, y: 68, w: 18, h: 30, opacity: .76 },
    { x: 80, y: 4, w: 18, h: 29, opacity: .78 }, { x: 53, y: 74, w: 19, h: 24, opacity: .8 },
  ],
  [
    { x: -13, y: 18, w: 25, h: 67, opacity: .8 }, { x: 13, y: 2, w: 43, h: 90, opacity: 1 },
    { x: 58, y: 54, w: 31, h: 43, opacity: .86 }, { x: 0, y: 70, w: 18, h: 28, opacity: .78 },
    { x: 80, y: 5, w: 18, h: 30, opacity: .8 }, { x: 54, y: 74, w: 18, h: 24, opacity: .8 },
  ],
  [
    { x: -12, y: 3, w: 19, h: 36, opacity: .76 }, { x: -3, y: 58, w: 28, h: 40, opacity: .84 },
    { x: 20, y: 1, w: 44, h: 89, opacity: 1 }, { x: 66, y: 56, w: 31, h: 41, opacity: .86 },
    { x: 81, y: 4, w: 17, h: 28, opacity: .78 }, { x: 2, y: 8, w: 17, h: 28, opacity: .8 },
  ],
  [
    { x: -13, y: 69, w: 20, h: 29, opacity: .76 }, { x: 0, y: 3, w: 20, h: 39, opacity: .78 },
    { x: -6, y: 10, w: 29, h: 63, opacity: .84 }, { x: 23, y: 1, w: 44, h: 89, opacity: 1 },
    { x: 69, y: 53, w: 29, h: 44, opacity: .88 }, { x: 2, y: 70, w: 22, h: 28, opacity: .8 },
  ],
  [
    { x: -12, y: 4, w: 17, h: 28, opacity: .76 }, { x: 1, y: 68, w: 22, h: 30, opacity: .78 },
    { x: 0, y: 5, w: 21, h: 43, opacity: .8 }, { x: -2, y: 56, w: 31, h: 41, opacity: .86 },
    { x: 26, y: 1, w: 44, h: 89, opacity: 1 }, { x: 72, y: 55, w: 26, h: 42, opacity: .88 },
  ],
  [
    { x: -12, y: 67, w: 18, h: 31, opacity: .76 }, { x: -10, y: 4, w: 17, h: 31, opacity: .76 },
    { x: 1, y: 2, w: 21, h: 45, opacity: .8 }, { x: 2, y: 59, w: 29, h: 38, opacity: .84 },
    { x: 72, y: 3, w: 26, h: 45, opacity: .88 }, { x: 28, y: 1, w: 44, h: 89, opacity: 1 },
  ],
];

/** Native scrolling with two chapter-level CSS sticky canvases and scoped cleanup. */
export function useHomeMotion(rootRef: React.RefObject<HTMLElement | null>, options: Options = {}) {
  const enabled = options.enabled ?? true;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      root.dataset.scrollEngine = "native";
      root.dataset.scrollTriggerCount = "0";
      return () => {
        delete root.dataset.scrollEngine;
        delete root.dataset.scrollTriggerCount;
      };
    }

    const runtimeWindow = window as Window & { __picvisualScrollTriggerRegistered?: boolean };
    if (!runtimeWindow.__picvisualScrollTriggerRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      runtimeWindow.__picvisualScrollTriggerRegistered = true;
    }

    const isMobile = window.matchMedia("(max-width: 800px)").matches;
    let alive = true;
    let removePointerMotion = () => {};
    root.dataset.scrollEngine = "native";

    const ctx = gsap.context(() => {
      const hero = root.querySelector<HTMLElement>(".pvh-hero");
      const heroStage = hero?.querySelector<HTMLElement>(".pvh-hero-stage");
      const heroCopy = hero?.querySelector<HTMLElement>(".pvh-hero-copy");
      const intro = root.querySelector<HTMLElement>(".pvh-intro");

      if (hero && heroStage && heroCopy) {
        const timeline = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: isMobile ? true : .24 } });
        timeline
          .to(heroStage, { scale: isMobile ? 1.04 : 1.08, xPercent: isMobile ? 0 : -4, yPercent: 3, force3D: true, ease: "none", duration: 1 }, 0)
          .to(heroCopy, { yPercent: isMobile ? -9 : -16, autoAlpha: .12, force3D: true, ease: "none", duration: .72 }, .18)
          .to(hero.querySelector<HTMLElement>(".pvh-actions"), { yPercent: -8, autoAlpha: 0, ease: "none", duration: .34 }, .42)
          .to(hero.querySelector<HTMLElement>(".pvh-hero-disciplines"), { xPercent: 10, autoAlpha: 0, ease: "none", duration: .36 }, .4);
        if (intro) timeline.fromTo(intro, { y: isMobile ? 16 : 84 }, { y: 0, ease: "none", duration: .72 }, .38);

        if (!isMobile && window.matchMedia("(pointer: fine)").matches) {
          const stageX = gsap.quickTo(heroStage, "xPercent", { duration: .7, ease: "power3.out" });
          const stageY = gsap.quickTo(heroStage, "yPercent", { duration: .7, ease: "power3.out" });
          const move = (event: PointerEvent) => {
            const bounds = hero.getBoundingClientRect();
            stageX(((event.clientX - bounds.left) / bounds.width - .5) * 1.1);
            stageY(((event.clientY - bounds.top) / bounds.height - .5) * .7);
          };
          const reset = () => { stageX(0); stageY(0); };
          hero.addEventListener("pointermove", move, { passive: true });
          hero.addEventListener("pointerleave", reset, { passive: true });
          removePointerMotion = () => {
            hero.removeEventListener("pointermove", move);
            hero.removeEventListener("pointerleave", reset);
          };
        }
      }

      if (intro) {
        const introFrames = Array.from(intro.querySelectorAll<HTMLElement>(".pvh-intro-frame"));
        const timeline = gsap.timeline({ scrollTrigger: { trigger: intro, start: "top 92%", end: "bottom 8%", scrub: isMobile ? true : .28 } });
        timeline
          .fromTo(intro.querySelector<HTMLElement>("h2"), { yPercent: 10, autoAlpha: .4 }, { yPercent: -4, autoAlpha: 1, ease: "none", duration: .48 }, 0)
          .fromTo(intro.querySelector<HTMLElement>(".pvh-intro-copy"), { yPercent: 12, autoAlpha: .4 }, { yPercent: -4, autoAlpha: 1, ease: "none", duration: .55 }, .05)
          .fromTo(intro.querySelectorAll<HTMLElement>(".pvh-intro-frame"), { yPercent: (index) => 10 + index * 5, scale: .98, autoAlpha: .42 }, { yPercent: (index) => isMobile ? 0 : -4 - index * 2, scale: 1, autoAlpha: 1, stagger: .08, force3D: true, ease: "none", duration: .68 }, .06)
          .fromTo(intro.querySelectorAll<HTMLElement>(".pvh-intro-frame img, .pvh-intro-frame video"), { scale: 1.1 }, { scale: 1.01, stagger: .04, force3D: true, ease: "none", duration: .82 }, .06);
        if (!isMobile && introFrames.length) {
          gsap.set(introFrames, { flexGrow: 1 });
          gsap.set(introFrames[0], { flexGrow: 2.35 });
          introFrames.slice(1).forEach((frame, index) => {
            const previous = index;
            const at = .18 + index * .24;
            timeline
              .to(introFrames[previous], { flexGrow: 1, duration: .32, ease: "power1.inOut" }, at)
              .to(frame, { flexGrow: 2.35, duration: .32, ease: "power1.inOut" }, at);
          });
        }
      }

      const rail = root.querySelector<HTMLElement>(".pvh-cap-rail");
      if (rail && !isMobile) {
        const panels = Array.from(rail.querySelectorAll<HTMLElement>(".pvh-cap-panel"));
        const panelField = rail.querySelector<HTMLElement>(".pvh-cap-panels");
        const header = rail.querySelector<HTMLElement>(".pvh-cap-rail-header");
        const proof = rail.querySelector<HTMLElement>(".pvh-cap-proof");
        const progress = rail.querySelector<HTMLElement>(".pvh-cap-progress i");
        const media = panels.map((panel) => panel.querySelector<HTMLElement>(".pvh-cap-panel-media img, .pvh-cap-panel-media video"));
        const details = panels.map((panel) => panel.querySelector<HTMLElement>(".pvh-cap-panel-detail"));
        const copyParts = panels.map((panel) => panel.querySelectorAll<HTMLElement>(".pvh-cap-panel-copy > span, .pvh-cap-panel-copy h3, .pvh-cap-panel-copy p"));

        gsap.set(panels, { flexGrow: 1 });
        if (panels[0]) gsap.set(panels[0], { flexGrow: 2.35 });
        copyParts.forEach((parts, index) => gsap.set(parts, { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 16 }));
        details.forEach((detail, index) => detail && gsap.set(detail, { autoAlpha: index === 0 ? 1 : 0, x: index === 0 ? 0 : 18, scale: index === 0 ? 1 : .95 }));
        media.forEach((item, index) => item && gsap.set(item, { scale: index === 0 ? 1.015 : 1.11, xPercent: index === 0 ? 0 : index % 2 ? 5 : -5 }));

        const timeline = gsap.timeline({ scrollTrigger: { trigger: rail, start: "top top", end: "bottom bottom", scrub: .16, invalidateOnRefresh: true } });
        panels.slice(1).forEach((panel, index) => {
          const previous = index;
          const next = index + 1;
          const at = index;
          timeline
            .to(panels[previous], { flexGrow: 1, ease: "power1.inOut", duration: 1 }, at)
            .to(panel, { flexGrow: 2.35, ease: "power1.inOut", duration: 1 }, at)
            .to(copyParts[previous], { autoAlpha: 0, y: -12, stagger: .02, duration: .25 }, at)
            .to(copyParts[next], { autoAlpha: 1, y: 0, stagger: .03, duration: .4 }, at + .34);
          if (media[previous]) timeline.to(media[previous], { scale: 1.11, xPercent: previous % 2 ? -4 : 4, ease: "none", duration: 1 }, at);
          if (media[next]) timeline.to(media[next], { scale: 1.015, xPercent: 0, ease: "none", duration: 1 }, at);
          if (details[previous]) timeline.to(details[previous], { autoAlpha: 0, x: -12, scale: .95, duration: .24 }, at);
          if (details[next]) timeline.to(details[next], { autoAlpha: 1, x: 0, scale: 1, duration: .34 }, at + .42);
        });
        const proofAt = Math.max(1, panels.length - 1);
        if (panelField && proof) timeline
          .to(panelField, { xPercent: -12, yPercent: 5, scale: .72, autoAlpha: .5, transformOrigin: "left center", duration: 1 }, proofAt)
          .to(header, { xPercent: -8, autoAlpha: .28, duration: .75 }, proofAt)
          .to(proof, { autoAlpha: 1, xPercent: 0, visibility: "visible", duration: .72 }, proofAt + .22);
        if (progress) timeline.to(progress, { scaleX: 1, ease: "none", duration: Math.max(1, panels.length) }, 0);
      } else if (rail) {
        gsap.fromTo(rail.querySelectorAll<HTMLElement>(".pvh-cap-panel"), { y: 28, autoAlpha: .5 }, { y: 0, autoAlpha: 1, stagger: .07, duration: .62, ease: "power3.out", scrollTrigger: { trigger: rail, start: "top 86%", toggleActions: "play none none reverse" } });
      }

      const production = root.querySelector<HTMLElement>(".pvh-production-chapter");
      if (production) {
        const serviceScroll = production.querySelector<HTMLElement>(".pvh-services-scroll") || production;
        const productionFlow = production.querySelector<HTMLElement>(".pvh-production-flow");
        const panels = Array.from(production.querySelectorAll<HTMLElement>(".pvh-service-panel"));
        const copies = panels.map((panel) => panel.querySelector<HTMLElement>(".pvh-service-panel-copy > span"));
        const images = panels.map((panel) => panel.querySelector<HTMLElement>("figure img"));
        const timeline = gsap.timeline({ scrollTrigger: { trigger: serviceScroll, start: isMobile ? "top 86%" : "top top", end: isMobile ? "bottom 14%" : "bottom bottom", scrub: isMobile ? true : .2 } });
        timeline.fromTo(production.querySelector<HTMLElement>(".pvh-production-header"), { yPercent: 8, autoAlpha: .45 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .25 }, 0);
        if (productionFlow) {
          gsap.fromTo(productionFlow, { yPercent: 3 }, {
            yPercent: 0,
            ease: "none",
            scrollTrigger: { trigger: productionFlow, start: "top 92%", end: "bottom 24%", scrub: isMobile ? true : .22 },
          });
          gsap.fromTo(productionFlow.querySelector<HTMLElement>(".pvh-process-media img, .pvh-process-media video"), { scale: 1.07 }, {
            scale: 1.01,
            force3D: true,
            ease: "none",
            scrollTrigger: { trigger: productionFlow, start: "top 92%", end: "bottom 24%", scrub: isMobile ? true : .22 },
          });
        }
        if (!isMobile && panels.length) {
          gsap.set(panels, { flexGrow: 1 });
          gsap.set(panels[0], { flexGrow: 2.15 });
          copies.forEach((copy, index) => copy && gsap.set(copy, { autoAlpha: index === 0 ? 1 : .16, y: index === 0 ? 0 : 8 }));
          panels.slice(1).forEach((panel, index) => {
            const previous = index;
            const next = index + 1;
            const at = .3 + index * .42;
            timeline
              .to(panels[previous], { flexGrow: 1, duration: .44 }, at)
              .to(panel, { flexGrow: 2.15, duration: .44 }, at)
              .to(copies[previous], { autoAlpha: .16, y: 8, duration: .18 }, at)
              .to(copies[next], { autoAlpha: 1, y: 0, duration: .24 }, at + .17);
            if (images[previous]) timeline.to(images[previous], { scale: 1.1, duration: .44, ease: "none" }, at);
            if (images[next]) timeline.fromTo(images[next], { scale: 1.09 }, { scale: 1.015, duration: .44, ease: "none" }, at);
          });
        }
        timeline
          .fromTo(production.querySelectorAll<HTMLElement>(".pvh-process-support"), { yPercent: (index) => 12 + index * 8, autoAlpha: .3 }, { yPercent: -3, autoAlpha: 1, stagger: .06, force3D: true, ease: "none", duration: .42 }, 1.12)
          .fromTo(production.querySelectorAll<HTMLElement>(".pvh-process-rail li"), { y: 20, autoAlpha: .4 }, { y: 0, autoAlpha: 1, stagger: .04, ease: "none", duration: .3 }, 1.28);
      }

      const workScroll = root.querySelector<HTMLElement>(".pvh-work-scroll");
      const workShell = root.querySelector<HTMLElement>(".pvh-work-shell");
      if (workScroll && workShell && !isMobile) {
        const heading = workShell.querySelector<HTMLElement>("header");
        const items = Array.from(workShell.querySelectorAll<HTMLElement>(".pvh-work-item"));
        const copies = items.map((item) => item.querySelector<HTMLElement>(".pvh-sample-project > div, .pvh-project-copy"));
        const images = items.map((item) => item.querySelector<HTMLElement>("img, video"));
        const timeline = gsap.timeline({ scrollTrigger: { trigger: workScroll, start: "top top", end: "bottom bottom", scrub: .16, invalidateOnRefresh: true } });
        items.forEach((item, index) => {
          const state = workStates[0][index % workStates[0].length];
          gsap.set(item, { left: `${state.x}%`, top: `${state.y}%`, right: "auto", bottom: "auto", width: `${state.w}%`, height: `${state.h}%`, autoAlpha: state.opacity });
          if (copies[index]) gsap.set(copies[index], { autoAlpha: index === 0 ? 1 : .16, y: index === 0 ? 0 : 12 });
          if (images[index]) gsap.set(images[index], { scale: index === 0 ? 1.015 : 1.08 });
        });
        workStates.slice(1).forEach((stateSet, stateIndex) => {
          const active = Math.min(stateIndex + 1, items.length - 1);
          const at = stateIndex;
          items.forEach((item, itemIndex) => {
            const state = stateSet[itemIndex % stateSet.length];
            timeline.to(item, { left: `${state.x}%`, top: `${state.y}%`, width: `${state.w}%`, height: `${state.h}%`, autoAlpha: state.opacity, ease: "power1.inOut", duration: 1 }, at);
            if (images[itemIndex]) timeline.to(images[itemIndex], { scale: itemIndex === active ? 1.01 : 1.08, xPercent: itemIndex === active ? 0 : itemIndex % 2 ? 3 : -3, force3D: true, ease: "none", duration: 1 }, at);
            if (copies[itemIndex]) timeline.to(copies[itemIndex], { autoAlpha: itemIndex === active ? 1 : .16, y: itemIndex === active ? 0 : 12, duration: .28 }, at + (itemIndex === active ? .38 : 0));
          });
        });
        timeline.to(heading, { xPercent: -4, autoAlpha: .28, ease: "none", duration: .75 }, workStates.length - 1.15);
      } else if (workShell) {
        gsap.fromTo(workShell.querySelectorAll<HTMLElement>(".pvh-work-item"), { y: 26, autoAlpha: .52 }, { y: 0, autoAlpha: 1, stagger: .06, duration: .62, ease: "power3.out", scrollTrigger: { trigger: workShell, start: "top 84%", toggleActions: "play none none reverse" } });
      }

      const gallery = root.querySelector<HTMLElement>(".pvh-work-resolution");
      if (gallery) {
        const timeline = gsap.timeline({ scrollTrigger: { trigger: gallery, start: "top 92%", end: "bottom 16%", scrub: isMobile ? true : .28 } });
        timeline.fromTo(gallery.querySelector<HTMLElement>("header"), { yPercent: 12, autoAlpha: .42 }, { yPercent: -3, autoAlpha: 1, ease: "none", duration: .34 }, 0);
        gallery.querySelectorAll<HTMLElement>(".pvh-gallery-frame").forEach((frame, index) => timeline.fromTo(frame,
          { xPercent: isMobile ? 0 : index % 2 ? 8 : -8, yPercent: 10 + index * 2, scale: .96, autoAlpha: .34 },
          { xPercent: isMobile ? 0 : index % 2 ? -2 : 2, yPercent: index % 2 ? -4 : -7, scale: index < 3 ? 1.015 : 1, autoAlpha: 1, force3D: true, ease: "none", duration: .5 },
          .04 + index * .07));
      }

      const why = root.querySelector<HTMLElement>(".pvh-why");
      if (why) {
        gsap.timeline({ scrollTrigger: { trigger: why, start: "top 90%", end: "bottom 18%", scrub: isMobile ? true : .28 } })
          .fromTo(why.querySelector<HTMLElement>(".pvh-trust-opening"), { yPercent: 7, autoAlpha: .5 }, { yPercent: -2, autoAlpha: 1, ease: "none", duration: .46 }, 0)
          .fromTo(why.querySelectorAll<HTMLElement>(".pvh-capability-media figure"), { yPercent: (index) => 9 + index * 5, scale: .97, autoAlpha: .45 }, { yPercent: (index) => -2 - index * 2, scale: 1, autoAlpha: 1, stagger: .06, force3D: true, ease: "none", duration: .5 }, .06)
          .fromTo(why.querySelector<HTMLElement>(".pvh-trust-core > header"), { xPercent: -5, autoAlpha: .42 }, { xPercent: 0, autoAlpha: 1, ease: "none", duration: .36 }, .42)
          .fromTo(why.querySelector<HTMLElement>(".pvh-why-anchor"), { xPercent: isMobile ? 0 : 7, yPercent: 6, scale: .98, autoAlpha: .45 }, { xPercent: 0, yPercent: -2, scale: 1, autoAlpha: 1, force3D: true, ease: "none", duration: .55 }, .45)
          .fromTo(why.querySelectorAll<HTMLElement>(".pvh-why-grid article"), { y: isMobile ? 22 : 40, autoAlpha: .35 }, { y: 0, autoAlpha: 1, stagger: .06, ease: "none", duration: .42 }, .66);
      }

      const faq = root.querySelector<HTMLElement>(".pvh-faq");
      if (faq) gsap.timeline({ scrollTrigger: { trigger: faq, start: "top 90%", end: "top 28%", scrub: isMobile ? true : .26 } })
        .fromTo(faq.querySelector<HTMLElement>("header"), { yPercent: 9, autoAlpha: .45 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .45 }, 0)
        .fromTo(faq.querySelector<HTMLElement>(".pvh-faq-list"), { yPercent: 5, autoAlpha: .55 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .45 }, .08);

      const cta = root.querySelector<HTMLElement>(".pvh-cta");
      if (cta) gsap.timeline({ scrollTrigger: { trigger: cta, start: "top 90%", end: "center 42%", scrub: isMobile ? true : .28 } })
        .fromTo(cta.querySelector<HTMLElement>(".pvh-cta-copy"), { yPercent: 12, autoAlpha: .35 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .5 }, 0)
        .fromTo(cta.querySelector<HTMLElement>(".pvh-cta-media img"), { scale: 1.1, xPercent: 4 }, { scale: 1.015, xPercent: 0, force3D: true, ease: "none", duration: .68 }, 0);
    }, root);

    const updateTriggerCount = () => {
      const count = ScrollTrigger.getAll().filter((trigger) => trigger.trigger instanceof Node && root.contains(trigger.trigger)).length;
      root.dataset.scrollTriggerCount = String(count);
    };
    let refreshFrame = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        if (!alive) return;
        ScrollTrigger.refresh();
        updateTriggerCount();
      });
    };
    updateTriggerCount();
    window.addEventListener("resize", refresh, { passive: true });
    void document.fonts?.ready.then(() => { if (alive) refresh(); });
    refresh();

    return () => {
      alive = false;
      cancelAnimationFrame(refreshFrame);
      removePointerMotion();
      window.removeEventListener("resize", refresh);
      ctx.revert();
      delete root.dataset.scrollTriggerCount;
      delete root.dataset.scrollEngine;
    };
  }, [rootRef, enabled]);
}
