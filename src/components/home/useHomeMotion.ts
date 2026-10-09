"use client";

import { useEffect } from "react";

type LenisLike = { raf: (time: number) => void; scrollTo: (target: number, options?: Record<string, unknown>) => void; destroy: () => void };

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const progressFor = (element: HTMLElement, viewport: number) => {
  const top = element.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - top) / Math.max(1, element.offsetHeight - viewport));
};

/** A single measured scroll loop: native geometry, CSS sticky ownership, optional Lenis interpolation. */
export function useHomeMotion(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      root.dataset.scrollEngine = "native-reduced";
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
      return () => { delete root.dataset.scrollEngine; };
    }

    const horizontal = root.querySelector<HTMLElement>("[data-scene='horizontal']");
    const track = root.querySelector<HTMLElement>(".pvh-horizontal-track");
    const horizontalProgress = root.querySelector<HTMLElement>(".pvh-horizontal-progress span");
    const categoryButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-panel-index]"));
    const work = root.querySelector<HTMLElement>("[data-scene='work']");
    const workGallery = root.querySelector<HTMLElement>(".pvh-work-gallery");
    const workLeft = root.querySelector<HTMLElement>(".pvh-work-column.is-left");
    const workRight = root.querySelector<HTMLElement>(".pvh-work-column.is-right");
    const workHeading = root.querySelector<HTMLElement>(".pvh-work-heading");
    const workFinale = root.querySelector<HTMLElement>(".pvh-work-finale");
    const why = root.querySelector<HTMLElement>("[data-scene='why']");
    const whyStage = root.querySelector<HTMLElement>(".pvh-why-stage");
    const heroMedia = root.querySelector<HTMLElement>(".pvh-hero-media");
    let lenis: LenisLike | null = null;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;
    let loopFrame = 0;
    let activePanel = -1;
    let maxTravel = 0;
    let disposed = false;

    const measure = () => { maxTravel = track ? Math.max(0, track.scrollWidth - window.innerWidth) : 0; };
    const setActivePanel = (index: number) => {
      if (index === activePanel) return;
      activePanel = index;
      categoryButtons.forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
    };
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const desktop = window.innerWidth >= 768;
      const heroProgress = clamp(window.scrollY / Math.max(1, viewport));
      if (heroMedia && desktop) heroMedia.style.transform = `translate3d(0, ${heroProgress * 5}%, 0) scale(${1 + heroProgress * .055})`;

      if (horizontal && track && desktop) {
        const progress = progressFor(horizontal, viewport);
        const travelProgress = clamp(progress / .9);
        track.style.transform = `translate3d(${-maxTravel * travelProgress}px, 0, 0)`;
        horizontalProgress?.style.setProperty("transform", `scaleX(${travelProgress})`);
        setActivePanel(Math.min(categoryButtons.length - 1, Math.round(travelProgress * Math.max(0, categoryButtons.length - 1))));
      }

      if (work && workGallery && workLeft && workRight && workHeading && workFinale && desktop) {
        const progress = progressFor(work, viewport);
        const travel = clamp(progress / .85);
        workLeft.style.transform = `translate3d(0, ${15 - travel * 80}%, 0)`;
        workRight.style.transform = `translate3d(0, ${-15 + travel * 80}%, 0)`;
        const opening = clamp(progress / .15);
        workHeading.style.transform = `translate3d(${opening * 35}%, 0, 0) scale(${1 - opening * .15})`;
        workHeading.style.opacity = String(1 - clamp((progress - .75) / .15));
        const settleScale = 1.15 - clamp(progress / .5) * .15;
        const exitScale = progress > .8 ? 1 + clamp((progress - .8) / .2) * 4 : settleScale;
        workGallery.style.transform = `scale(${exitScale})`;
        workGallery.style.filter = `blur(${clamp((progress - .8) / .15) * 70}px)`;
        workGallery.style.opacity = String(1 - clamp((progress - .85) / .13));
        const finaleProgress = clamp((progress - .65) / .33);
        workFinale.style.clipPath = `circle(${finaleProgress * 150}% at 50% 50%)`;
        workFinale.style.opacity = String(clamp((progress - .6) / .15));
      }

      if (why && whyStage && desktop) {
        const progress = progressFor(why, viewport);
        whyStage.style.transform = `translate3d(0, ${-progress * 100}vh, 0) scale(${1 - progress * .1})`;
        whyStage.style.borderRadius = `${clamp(progress / .5) * 32}px`;
        whyStage.style.opacity = String(1 - clamp((progress - .7) / .3));
      }
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    const animate = (time: number) => { if (disposed) return; lenis?.raf(time); update(); loopFrame = requestAnimationFrame(animate); };
    const scrollToPanel = (index: number) => {
      if (!horizontal) return;
      const top = horizontal.getBoundingClientRect().top + window.scrollY;
      const maximum = Math.max(0, horizontal.offsetHeight - window.innerHeight);
      const target = top + maximum * .9 * (index / Math.max(1, categoryButtons.length - 1));
      if (lenis) lenis.scrollTo(target, { duration: 1.5 });
      else window.scrollTo({ top: target, behavior: "smooth" });
    };
    const buttonHandlers = categoryButtons.map((button, index) => {
      const handler = () => scrollToPanel(index);
      button.addEventListener("click", handler);
      return { button, handler };
    });

    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: .14 });
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => observer.observe(element));

    const resizeObserver = new ResizeObserver(() => { measure(); requestUpdate(); });
    resizeObserver.observe(root);
    if (track) resizeObserver.observe(track);
    measure();
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });

    const startLenis = () => {
      void import("lenis").then(({ default: Lenis }) => {
        if (disposed || reduced.matches || !window.matchMedia("(pointer: fine)").matches) return;
        lenis = new Lenis({ duration: 2, smoothWheel: true, wheelMultiplier: .8, touchMultiplier: 1.5, easing: (value: number) => Math.min(1, 1.001 - Math.pow(2, -10 * value)), autoRaf: false });
        root.dataset.scrollEngine = "lenis-native-sticky";
        loopFrame = requestAnimationFrame(animate);
      });
    };
    if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(startLenis, { timeout: 1500 });
    else timeoutHandle = setTimeout(startLenis, 800);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(loopFrame);
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      lenis?.destroy();
      observer.disconnect();
      resizeObserver.disconnect();
      buttonHandlers.forEach(({ button, handler }) => button.removeEventListener("click", handler));
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      delete root.dataset.scrollEngine;
    };
  }, [rootRef]);
}
