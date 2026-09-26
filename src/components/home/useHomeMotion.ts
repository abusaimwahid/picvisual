"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

type Options = { enabled?: boolean; mediaMode?: "empty" | "media" };

const WORLD_TYPES = ["imagePost", "product", "jewelry", "videoEdit", "motion", "creative", "development"] as const;

const worldMotion = {
  imagePost: [
    [{ xPercent: -2, yPercent: -8, z: 90, rotateY: -2, scale: 1.07 }, { xPercent: -11, yPercent: 8, z: -130, rotateY: 3, scale: .96 }],
    [{ xPercent: 36, yPercent: -22, z: 260, rotateX: 3, rotateY: -6, scale: 1.14 }, { xPercent: -5, yPercent: 8, z: 70, rotateX: -1, rotateY: 2, scale: 1.02 }],
    [{ xPercent: -24, yPercent: 28, z: -140, rotateY: 5, scale: .86 }, { xPercent: 8, yPercent: -9, z: 210, rotateY: -3, scale: 1.11 }],
  ],
  product: [
    [{ xPercent: -16, yPercent: 10, z: -90, rotateY: -5, scale: .9 }, { xPercent: 2, yPercent: -4, z: 185, rotateY: 1, scale: 1.1 }],
    [{ xPercent: -30, yPercent: -15, z: 135, rotateY: 7, scale: 1.08 }, { xPercent: 14, yPercent: 12, z: -65, rotateY: -3, scale: .94 }],
    [{ xPercent: 34, yPercent: 26, z: 245, rotateX: -3, scale: 1.16 }, { xPercent: -7, yPercent: -10, z: 55, rotateX: 1, scale: 1.01 }],
  ],
  jewelry: [
    [{ xPercent: -4, yPercent: 9, z: -45, rotateY: -2, scale: .96 }, { xPercent: 3, yPercent: -6, z: 155, rotateY: 2, scale: 1.12 }],
    [{ xPercent: -25, yPercent: -22, z: 230, rotateY: 6, scale: 1.13 }, { xPercent: 10, yPercent: 11, z: 40, rotateY: -2, scale: 1 }],
    [{ xPercent: 30, yPercent: 22, z: -105, rotateX: -3, scale: .89 }, { xPercent: -9, yPercent: -12, z: 225, rotateX: 2, scale: 1.12 }],
  ],
  videoEdit: [
    [{ xPercent: -10, yPercent: 6, z: -105, rotateY: -4, scale: .9 }, { xPercent: 5, yPercent: -5, z: 130, rotateY: 2, scale: 1.09 }],
    [{ xPercent: -42, yPercent: -18, z: 180, rotateY: 8, scale: 1.1 }, { xPercent: 18, yPercent: 13, z: -45, rotateY: -3, scale: .96 }],
    [{ xPercent: 42, yPercent: 24, z: -85, rotateY: -7, scale: .92 }, { xPercent: -14, yPercent: -13, z: 235, rotateY: 3, scale: 1.13 }],
  ],
  motion: [
    [{ xPercent: -18, yPercent: 12, z: -120, rotateY: -5, scale: .88 }, { xPercent: 8, yPercent: -7, z: 170, rotateY: 2, scale: 1.11 }],
    [{ xPercent: -48, yPercent: -20, z: 210, rotateY: 8, scale: 1.14 }, { xPercent: 21, yPercent: 16, z: -60, rotateY: -3, scale: .94 }],
    [{ xPercent: 48, yPercent: 30, z: -100, rotateY: -8, scale: .9 }, { xPercent: -18, yPercent: -15, z: 260, rotateY: 4, scale: 1.15 }],
  ],
  creative: [
    [{ xPercent: -20, yPercent: 12, z: -150, rotateY: -7, scale: .88 }, { xPercent: 0, yPercent: 0, z: 70, rotateY: 0, scale: 1.02 }],
    [{ xPercent: 34, yPercent: -24, z: 245, rotateX: 4, rotateY: 8, scale: 1.14 }, { xPercent: 1, yPercent: 1, z: 35, rotateX: 0, rotateY: 0, scale: 1.01 }],
    [{ xPercent: -36, yPercent: 31, z: 125, rotateX: -4, rotateY: -8, scale: 1.1 }, { xPercent: -1, yPercent: -1, z: 15, rotateX: 0, rotateY: 0, scale: 1 }],
  ],
  development: [
    [{ xPercent: -20, yPercent: 12, z: -150, rotateY: -7, scale: .88 }, { xPercent: 0, yPercent: 0, z: 70, rotateY: 0, scale: 1.02 }],
    [{ xPercent: 34, yPercent: -24, z: 245, rotateX: 4, rotateY: 8, scale: 1.14 }, { xPercent: 1, yPercent: 1, z: 35, rotateX: 0, rotateY: 0, scale: 1.01 }],
    [{ xPercent: -36, yPercent: 31, z: 125, rotateX: -4, rotateY: -8, scale: 1.1 }, { xPercent: -1, yPercent: -1, z: 15, rotateX: 0, rotateY: 0, scale: 1 }],
  ],
};

/** One Lenis instance and one scoped GSAP context, with complete route/HMR cleanup. */
export function useHomeMotion(rootRef: React.RefObject<HTMLElement | null>, options: Options = {}) {
  const { enabled = true, mediaMode = "empty" } = options;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      return;
    }

    const runtimeWindow = window as Window & { __picvisualScrollTriggerRegistered?: boolean };
    if (!runtimeWindow.__picvisualScrollTriggerRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      runtimeWindow.__picvisualScrollTriggerRegistered = true;
    }

    const isMobile = window.matchMedia("(max-width: 800px)").matches;
    const isTablet = !isMobile && window.matchMedia("(max-width: 1100px)").matches;
    let alive = true;
    let removePointerMotion = () => {};
    const lenis = new Lenis({ duration: isMobile ? .9 : 1.15, smoothWheel: true, touchMultiplier: 1.05 });
    lenis.on("scroll", ScrollTrigger.update);
    const updateLenis = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        if (element.matches(".pvh-intro, .pvh-world, .pvh-proof, .pvh-process, .pvh-services, .pvh-work, .pvh-gallery, .pvh-capabilities, .pvh-why, .pvh-faq, .pvh-cta")) return;
        gsap.fromTo(element, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1, y: 0, duration: .9, ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 88%", toggleActions: "play none none reverse" },
        });
      });

      const hero = root.querySelector<HTMLElement>(".pvh-hero");
      const heroStage = root.querySelector<HTMLElement>(".pvh-hero-stage");
      const heroCopy = root.querySelector<HTMLElement>(".pvh-hero-copy");
      const heroShade = root.querySelector<HTMLElement>(".pvh-hero-shade");
      const heroKicker = root.querySelector<HTMLElement>(".pvh-hero .pvh-kicker");
      const heroBody = root.querySelector<HTMLElement>(".pvh-hero-copy > p");
      const heroActions = root.querySelector<HTMLElement>(".pvh-hero .pvh-actions");
      const heroDisciplines = root.querySelector<HTMLElement>(".pvh-hero-disciplines");
      const intro = root.querySelector<HTMLElement>(".pvh-intro");
      if (hero && heroStage) {
        const heroTimeline = gsap.timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: isMobile ? .65 : 1.05 },
        });
        heroTimeline
          .to(heroStage, { scale: isMobile ? 1.11 : 1.17, yPercent: isMobile ? 7 : 11, z: -70, clipPath: isMobile ? "inset(0% 0% 0% 0%)" : "inset(2.5% 2% 0% 2%)", force3D: true, ease: "none", duration: 1 }, 0)
          .to(heroShade, { opacity: 1.22, ease: "none", duration: 1 }, 0)
          .to(heroCopy, { yPercent: isMobile ? -15 : -28, z: 95, autoAlpha: .06, force3D: true, ease: "none", duration: .9 }, 0)
          .to(heroKicker, { xPercent: isMobile ? -5 : -18, yPercent: -35, ease: "none", duration: .7 }, 0)
          .to(heroBody, { yPercent: -18, autoAlpha: .14, ease: "none", duration: .62 }, .12)
          .to(heroActions, { yPercent: -8, autoAlpha: 0, ease: "none", duration: .42 }, .38)
          .to(heroDisciplines, { xPercent: isMobile ? 8 : 24, autoAlpha: 0, ease: "none", duration: .45 }, .28);
        if (intro) heroTimeline.fromTo(intro, { y: isMobile ? 28 : 92 }, { y: 0, ease: "none", duration: .68 }, .24);

        if (!isMobile && window.matchMedia("(pointer: fine)").matches) {
          const stageX = gsap.quickTo(heroStage, "xPercent", { duration: .75, ease: "power3.out" });
          const stageRotateX = gsap.quickTo(heroStage, "rotateX", { duration: .85, ease: "power3.out" });
          const stageRotateY = gsap.quickTo(heroStage, "rotateY", { duration: .85, ease: "power3.out" });
          const copyX = heroCopy ? gsap.quickTo(heroCopy, "xPercent", { duration: .7, ease: "power3.out" }) : null;
          const move = (event: PointerEvent) => {
            const bounds = hero.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
            const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
            stageX(x * 1.9);
            stageRotateX(y * -2.1);
            stageRotateY(x * 2.8);
            copyX?.(x * -1.25);
          };
          const reset = () => { stageX(0); stageRotateX(0); stageRotateY(0); copyX?.(0); };
          hero.addEventListener("pointermove", move, { passive: true });
          hero.addEventListener("pointerleave", reset, { passive: true });
          removePointerMotion = () => {
            hero.removeEventListener("pointermove", move);
            hero.removeEventListener("pointerleave", reset);
          };
        }
      }

      if (intro) {
        const statement = intro.querySelector<HTMLElement>("h2");
        const label = intro.querySelector<HTMLElement>(".pvh-index");
        const copy = intro.querySelector<HTMLElement>(".pvh-intro-copy");
        const ghost = intro.querySelector<HTMLElement>(".pvh-intro-ghost");
        const frames = intro.querySelectorAll<HTMLElement>(".pvh-intro-frame");
        const introTimeline = gsap.timeline({ scrollTrigger: { trigger: intro, start: "top 82%", end: "bottom 18%", scrub: isMobile ? .6 : 1 } });
        gsap.fromTo(statement,
          { clipPath: "inset(0 0 100% 0)", yPercent: isMobile ? 5 : 8, autoAlpha: .45 },
          { clipPath: "inset(0 0 0% 0)", yPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: intro, start: "top 98%", end: "top 52%", scrub: isMobile ? .4 : .58 } });
        introTimeline
          .fromTo(label, { autoAlpha: .15, y: 14 }, { autoAlpha: 1, y: 0, ease: "none", duration: .35 }, 0)
          .fromTo(copy, { yPercent: 22, autoAlpha: .35 }, { yPercent: -7, autoAlpha: 1, ease: "none", duration: .72 }, .12)
          .fromTo(ghost, { xPercent: -24, yPercent: 18, autoAlpha: .02 }, { xPercent: 14, yPercent: -9, autoAlpha: .1, ease: "none", duration: 1 }, 0);
        frames.forEach((frame, index) => {
          const desktopStates = [
            [{ xPercent: -13, yPercent: 15, z: 110, rotateX: 1.5, rotateY: -3.5, scale: 1.08 }, { xPercent: 2, yPercent: -8, z: 220, rotateX: 0, rotateY: 1, scale: 1.02 }],
            [{ xPercent: 25, yPercent: -7, z: -120, rotateX: -2, rotateY: 5, scale: .87 }, { xPercent: -4, yPercent: 8, z: 55, rotateX: 1, rotateY: -1, scale: 1.04 }],
            [{ xPercent: -18, yPercent: 34, z: -250, rotateX: 4, rotateY: -5, scale: .78 }, { xPercent: 8, yPercent: -13, z: -55, rotateX: 0, rotateY: 2, scale: .96 }],
          ];
          const states = desktopStates[index] || desktopStates[0];
          introTimeline.fromTo(frame,
            isMobile ? { xPercent: index === 1 ? 9 : -7, yPercent: index * 8, scale: index ? .96 : 1.03 } : states[0],
            { ...(isMobile ? { xPercent: 0, yPercent: index ? -6 : -3, scale: 1 } : states[1]), force3D: true, ease: "none", duration: .92 }, index * .04);
        });
      }

      const worlds = root.querySelectorAll<HTMLElement>(".pvh-world");
      worlds.forEach((world) => {
        if (world.dataset.hasMedia !== "true" || mediaMode === "empty") return;
        const planes = world.querySelectorAll<HTMLElement>(".pvh-plane");
        const title = world.querySelector<HTMLElement>(".pvh-world-title");
        const body = world.querySelector<HTMLElement>(".pvh-world-copy p");
        const progress = world.querySelector<HTMLElement>(".pvh-scene-progress i");
        const beats = world.querySelectorAll<HTMLElement>(".pvh-scene-progress span");
        const interfaceLayer = world.querySelector<HTMLElement>(".pvh-editing-ui, .pvh-motion-ui, .pvh-compose-ui");
        const type = WORLD_TYPES.find((candidate) => world.classList.contains(`world-${candidate}`)) || "imagePost";
        const config = worldMotion[type];
        const timeline = gsap.timeline({ scrollTrigger: { trigger: world, start: isMobile ? "top 88%" : "top 72%", end: isMobile ? "bottom 22%" : "bottom 18%", scrub: isMobile ? .65 : 1.15 } });
        planes.forEach((plane, index) => {
          const states = config[index] || worldMotion.imagePost[index] || worldMotion.imagePost[0];
          if (isMobile && index > 1) return;
          timeline.fromTo(plane,
            isMobile ? { yPercent: index ? 16 : 9, scale: index ? 1.04 : .96, autoAlpha: .78 } : states[0],
            { ...(isMobile ? { yPercent: index ? -8 : -3, scale: 1, autoAlpha: 1 } : states[1]), force3D: true, ease: "none", duration: 1 }, index * (isMobile ? .05 : .035));
        });
        timeline
          .fromTo(title, { xPercent: isMobile ? -5 : (world.classList.contains("world-2") || world.classList.contains("world-4") ? 13 : -10), yPercent: 13, autoAlpha: .58 }, { xPercent: isMobile ? 0 : 6, yPercent: -12, autoAlpha: 1, ease: "none", duration: .9 }, 0)
          .fromTo(body, { yPercent: 18, autoAlpha: .3 }, { yPercent: -6, autoAlpha: 1, ease: "none", duration: .62 }, .18)
          .fromTo(progress, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", ease: "none", duration: .94 }, .02)
          .fromTo(beats, { autoAlpha: .18, y: 8 }, { autoAlpha: 1, y: 0, stagger: .16, ease: "none", duration: .5 }, .15);
        if (interfaceLayer) timeline.fromTo(interfaceLayer, { autoAlpha: 0, yPercent: 22, z: -90 }, { autoAlpha: 1, yPercent: -5, z: 150, force3D: true, ease: "none", duration: .72 }, .16);
      });

      if (!isMobile) {
        worlds.forEach((world, index) => {
          const next = worlds[index + 1];
          const stage = world.querySelector<HTMLElement>(".pvh-world-stage");
          const copy = world.querySelector<HTMLElement>(".pvh-world-copy");
          if (!next || !stage) return;
          gsap.to(stage, { yPercent: -11, z: -150, scale: .94, autoAlpha: .58, force3D: true, ease: "none", scrollTrigger: { trigger: next, start: "top 96%", end: "top 38%", scrub: 1 } });
          if (copy) gsap.to(copy, { yPercent: -18, autoAlpha: .22, ease: "none", scrollTrigger: { trigger: next, start: "top 96%", end: "top 48%", scrub: .9 } });
        });
      }

      const proof = root.querySelector<HTMLElement>(".pvh-proof");
      if (proof) {
        const title = proof.querySelector<HTMLElement>("h2");
        const stage = proof.querySelector<HTMLElement>(".pvh-proof-stage");
        const labels = proof.querySelectorAll<HTMLElement>(".pvh-proof-label, .pvh-proof-sample");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: proof, start: "top 86%", end: "bottom 24%", scrub: isMobile ? .55 : 1 } });
        timeline
          .fromTo(title, { xPercent: -9, autoAlpha: .4 }, { xPercent: isMobile ? 0 : 5, autoAlpha: 1, ease: "none", duration: .62 }, 0)
          .fromTo(stage, { clipPath: "inset(8% 11% 8% 11%)", yPercent: 9, z: -110, rotateX: isMobile ? 0 : 2.5 }, { clipPath: "inset(0% 0% 0% 0%)", yPercent: -3, z: 45, rotateX: 0, force3D: true, ease: "none", duration: .88 }, .06)
          .fromTo(labels, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: .1, ease: "none", duration: .36 }, .36);
      }

      const process = root.querySelector<HTMLElement>(".pvh-process");
      if (process) {
        const composition = process.querySelector<HTMLElement>(".pvh-process-composition");
        const processMedia = process.querySelector<HTMLElement>(".pvh-process-media");
        const processImage = processMedia?.querySelector<HTMLElement>("img, video");
        const support = process.querySelectorAll<HTMLElement>(".pvh-process-support");
        const processTitle = process.querySelector<HTMLElement>("h2");
        const steps = process.querySelectorAll<HTMLElement>(".pvh-process-rail li");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: process, start: "top 86%", end: "bottom 12%", scrub: isMobile ? .5 : .88 } });
        timeline
          .fromTo(processTitle, { xPercent: -7, autoAlpha: .45 }, { xPercent: isMobile ? 0 : 4, autoAlpha: 1, ease: "none", duration: .45 }, 0)
          .fromTo(composition, { yPercent: 7, z: -120, scale: .96 }, { yPercent: -3, z: 45, scale: 1, force3D: true, ease: "none", duration: .78 }, .02)
          .fromTo(processMedia, { clipPath: "inset(9% 10% 9% 10%)", rotateY: isMobile ? 0 : -2.5 }, { clipPath: "inset(0% 0% 0% 0%)", rotateY: 0, force3D: true, ease: "none", duration: .72 }, .03);
        if (processImage) timeline.fromTo(processImage, { scale: 1.14, yPercent: 6 }, { scale: 1.01, yPercent: -5, ease: "none", duration: .8 }, .03);
        if (support[0]) timeline.fromTo(support[0], { xPercent: isMobile ? 8 : 55, yPercent: 22, z: 230, rotateY: isMobile ? 0 : -8, scale: .9 }, { xPercent: -7, yPercent: -16, z: 85, rotateY: 0, scale: 1, force3D: true, ease: "none", duration: .72 }, .1);
        if (support[1]) timeline.fromTo(support[1], { xPercent: isMobile ? -7 : -36, yPercent: 52, z: -150, rotateX: isMobile ? 0 : 4, scale: .82 }, { xPercent: 8, yPercent: -12, z: 165, rotateX: 0, scale: 1.02, force3D: true, ease: "none", duration: .74 }, .2);
        timeline
          .fromTo(steps, { y: isMobile ? 22 : 48, autoAlpha: .24 }, { y: 0, autoAlpha: 1, stagger: .055, ease: "none", duration: .46 }, .32)
          .to(composition, { yPercent: -8, z: -70, scale: .97, force3D: true, ease: "none", duration: .25 }, .75);
      }

      const servicesSection = root.querySelector<HTMLElement>(".pvh-services");
      if (servicesSection) {
        const visualStage = servicesSection.querySelector<HTMLElement>(".pvh-service-visual-stage");
        const rows = servicesSection.querySelectorAll<HTMLButtonElement>(".pvh-service-row3d");
        gsap.fromTo(visualStage, { z: -100, rotateY: isMobile ? 0 : -4, scale: .93 }, { z: 40, rotateY: 0, scale: 1, force3D: true, ease: "none", scrollTrigger: { trigger: servicesSection, start: "top 86%", end: "bottom 30%", scrub: isMobile ? .55 : 1 } });
        rows.forEach((row, index) => {
          gsap.fromTo(row, { xPercent: isMobile ? -5 : -12, autoAlpha: .35 }, { xPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: row, start: "top 91%", end: "center 64%", scrub: .55 } });
          ScrollTrigger.create({
            trigger: row, start: isMobile ? "center 66%" : "center 62%", end: isMobile ? "bottom 52%" : "bottom 45%",
            onEnter: () => row.click(), onEnterBack: () => row.click(), onLeaveBack: () => { if (index > 0) rows[index - 1]?.click(); },
          });
        });
      }

      const work = root.querySelector<HTMLElement>(".pvh-work");
      if (work) {
        const workTitle = work.querySelector<HTMLElement>("h2");
        gsap.fromTo(workTitle, { xPercent: -7, yPercent: 12 }, { xPercent: isMobile ? 0 : 4, yPercent: -5, scale: isMobile ? 1 : .82, transformOrigin: "left top", ease: "none", scrollTrigger: { trigger: work, start: "top 90%", end: "top 12%", scrub: isMobile ? .5 : .8 } });
        const sampleRail = work.querySelector<HTMLElement>(".pvh-sample-projects");
        const sampleProjects = work.querySelectorAll<HTMLElement>(".pvh-sample-project");
        if (sampleRail && sampleProjects.length && !isMobile) {
          gsap.set(sampleProjects, { autoAlpha: 0, xPercent: 58, yPercent: 7, z: -260, rotateY: -5, scale: .64, transformOrigin: "center center" });
          gsap.set(sampleProjects[0], { autoAlpha: 1, xPercent: 0, yPercent: 0, z: 60, rotateY: 0, scale: 1 });
          if (sampleProjects[1]) gsap.set(sampleProjects[1], { autoAlpha: .34, xPercent: 52, yPercent: -4, z: -170, rotateY: -4, scale: .66 });
          const relay = gsap.timeline({ scrollTrigger: { trigger: sampleRail, start: "top top", end: "bottom bottom", scrub: .82, invalidateOnRefresh: true } });
          for (let index = 1; index < sampleProjects.length; index += 1) {
            const at = index - 1;
            const previous = sampleProjects[index - 1];
            const current = sampleProjects[index];
            relay
              .to(previous, { xPercent: -54, yPercent: -11, z: -260, rotateY: 4, scale: .64, autoAlpha: .1, force3D: true, ease: "none", duration: 1 }, at)
              .to(current, { xPercent: 0, yPercent: 0, z: 65, rotateY: 0, scale: 1, autoAlpha: 1, force3D: true, ease: "none", duration: 1 }, at);
            const next = sampleProjects[index + 1];
            if (next) relay.to(next, { xPercent: 51, yPercent: index % 2 ? 5 : -5, z: -170, rotateY: -4, scale: .66, autoAlpha: .34, force3D: true, ease: "none", duration: .58 }, at + .3);
          }
        }
        const independentlyAnimated = sampleRail && !isMobile
          ? work.querySelectorAll<HTMLElement>(".pvh-project")
          : work.querySelectorAll<HTMLElement>(".pvh-sample-project, .pvh-project");
        independentlyAnimated.forEach((project, index) => {
          const visual = project.querySelector<HTMLElement>("figure, .pvh-project-visual");
          const copy = project.querySelector<HTMLElement>("div:last-child, .pvh-project-copy");
          const direction = index % 2 ? 1 : -1;
          if (visual) gsap.fromTo(visual,
            { xPercent: direction * (isMobile ? 7 : 18), yPercent: 13, z: isMobile ? 0 : 110, rotateY: isMobile ? 0 : direction * -4, scale: .91 },
            { xPercent: direction * -3, yPercent: -7, z: 0, rotateY: 0, scale: 1, force3D: true, ease: "none", scrollTrigger: { trigger: project, start: "top 92%", end: "bottom 22%", scrub: isMobile ? .6 : 1 } });
          if (copy) gsap.fromTo(copy, { xPercent: direction * -8, autoAlpha: .35 }, { xPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: project, start: "top 82%", end: "center 44%", scrub: .65 } });
        });
      }

      const gallery = root.querySelector<HTMLElement>(".pvh-gallery-stage");
      if (gallery) {
        const frames = gallery.querySelectorAll<HTMLElement>(".pvh-gallery-frame");
        if (isMobile) {
          frames.forEach((frame, index) => gsap.fromTo(frame,
            { yPercent: 10 + index * 2, autoAlpha: .55, scale: .96 },
            { yPercent: -4, autoAlpha: 1, scale: 1, ease: "none", scrollTrigger: { trigger: frame, start: "top 94%", end: "bottom 36%", scrub: .48 } }));
        } else {
          const galleryTimeline = gsap.timeline({ scrollTrigger: { trigger: gallery, start: "top 95%", end: "bottom 10%", scrub: 1.05 } });
          const starts = [
            { xPercent: -9, yPercent: 20, z: -80, scale: .93, autoAlpha: .86 },
            { xPercent: 15, yPercent: 28, z: -150, scale: .88, autoAlpha: .62 },
            { xPercent: 24, yPercent: 34, z: 180, scale: .86, autoAlpha: 0 },
            { xPercent: -18, yPercent: 42, z: -120, scale: .88, autoAlpha: 0 },
            { xPercent: -24, yPercent: 48, z: 220, scale: .82, autoAlpha: 0 },
            { xPercent: 18, yPercent: 42, z: -220, scale: .82, autoAlpha: 0 },
          ];
          const ends = [
            { xPercent: 1, yPercent: -9, z: 70, scale: 1.01, autoAlpha: 1 },
            { xPercent: -4, yPercent: -14, z: 15, scale: 1, autoAlpha: 1 },
            { xPercent: -7, yPercent: -18, z: 110, scale: 1.03, autoAlpha: 1 },
            { xPercent: 6, yPercent: -10, z: -25, scale: 1, autoAlpha: 1 },
            { xPercent: 8, yPercent: -5, z: 150, scale: 1.04, autoAlpha: 1 },
            { xPercent: -5, yPercent: 1, z: -70, scale: .98, autoAlpha: .9 },
          ];
          frames.forEach((frame, index) => galleryTimeline.fromTo(frame, starts[index], { ...ends[index], rotateZ: index % 2 ? -.55 : .55, force3D: true, ease: "none", duration: .62 }, index < 2 ? 0 : .16 + (index - 2) * .17));
          const capabilities = root.querySelector<HTMLElement>(".pvh-capabilities");
          if (capabilities) gsap.to(gallery, { yPercent: -8, z: -170, scale: .96, autoAlpha: .58, force3D: true, ease: "none", scrollTrigger: { trigger: capabilities, start: "top bottom", end: "top 54%", scrub: .85 } });
        }
      }

      const capabilitiesSection = root.querySelector<HTMLElement>(".pvh-capabilities");
      if (capabilitiesSection) {
        const stage = capabilitiesSection.querySelector<HTMLElement>(".pvh-capability-media");
        const frames = capabilitiesSection.querySelectorAll<HTMLElement>(".pvh-capability-media figure");
        const heading = capabilitiesSection.querySelector<HTMLElement>("h2");
        const chips = capabilitiesSection.querySelectorAll<HTMLElement>(".pvh-chip-rail li");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: capabilitiesSection, start: "top 90%", end: "bottom 16%", scrub: isMobile ? .55 : .9 } });
        timeline
          .fromTo(heading, { xPercent: -7, autoAlpha: .45 }, { xPercent: 0, autoAlpha: 1, ease: "none", duration: .45 }, 0)
          .fromTo(stage, { yPercent: 10, z: -120, scale: .93 }, { yPercent: -5, z: 55, scale: 1, force3D: true, ease: "none", duration: .82 }, 0);
        const starts = [
          { xPercent: 8, yPercent: 12, z: -120, scale: .94 },
          { xPercent: -38, yPercent: -18, z: 210, scale: .86 },
          { xPercent: 34, yPercent: 28, z: 260, scale: .82 },
        ];
        const ends = [
          { xPercent: -2, yPercent: -7, z: 35, scale: 1.02 },
          { xPercent: 6, yPercent: 4, z: 95, scale: 1 },
          { xPercent: -5, yPercent: -10, z: 145, scale: 1.04 },
        ];
        frames.forEach((frame, index) => timeline.fromTo(frame, starts[index], { ...ends[index], force3D: true, ease: "none", duration: .74 }, .06 + index * .09));
        timeline.fromTo(chips, { y: 18, autoAlpha: 1 }, { y: 0, autoAlpha: 1, stagger: .035, ease: "none", duration: .38 }, .26);
      }

      const why = root.querySelector<HTMLElement>(".pvh-why");
      if (why) {
        const title = why.querySelector<HTMLElement>("h2");
        const cards = why.querySelectorAll<HTMLElement>(".pvh-why-grid article");
        const anchor = why.querySelector<HTMLElement>(".pvh-why-anchor");
        const fragments = why.querySelectorAll<HTMLElement>(".pvh-trust-fragment");
        const signal = why.querySelector<HTMLElement>(".pvh-why-signal");
        const signalWord = why.querySelector<HTMLElement>(".pvh-why-signal strong");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: why, start: "top 94%", end: "bottom 14%", scrub: isMobile ? .55 : .92 } });
        timeline
          .fromTo(title, { xPercent: -8, autoAlpha: .45 }, { xPercent: isMobile ? 0 : 4, autoAlpha: 1, ease: "none", duration: .55 }, 0)
          .fromTo(anchor, { xPercent: isMobile ? 0 : 19, yPercent: 18, z: -160, scale: .9, autoAlpha: .42 }, { xPercent: 0, yPercent: -9, z: 65, scale: 1.02, autoAlpha: .78, force3D: true, ease: "none", duration: .78 }, 0)
          .fromTo(cards, { y: isMobile ? 24 : 62, z: isMobile ? 0 : -80, autoAlpha: .3 }, { y: 0, z: 25, autoAlpha: 1, stagger: .09, force3D: true, ease: "none", duration: .6 }, .16)
          .fromTo(fragments, { yPercent: 24, xPercent: isMobile ? 0 : -7, scale: 1.12 }, { yPercent: -8, xPercent: isMobile ? 0 : 4, scale: 1, stagger: .08, ease: "none", duration: .62 }, .18)
          .fromTo(signal, { clipPath: "inset(12% 8% 12% 8%)", z: -80 }, { clipPath: "inset(0% 0% 0% 0%)", z: 25, force3D: true, ease: "none", duration: .74 }, .28)
          .fromTo(signalWord, { xPercent: -12, autoAlpha: .04 }, { xPercent: 5, autoAlpha: .18, ease: "none", duration: .72 }, .28)
          .to(anchor, { yPercent: -24, z: -120, scale: .94, autoAlpha: .38, force3D: true, ease: "none", duration: .24 }, .76);
      }

      const faq = root.querySelector<HTMLElement>(".pvh-faq");
      if (faq) {
        const faqMedia = faq.querySelector<HTMLElement>(".pvh-faq-media");
        const faqTitle = faq.querySelector<HTMLElement>("h2");
        const faqList = faq.querySelector<HTMLElement>(".pvh-faq-list");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: faq, start: "top 94%", end: "top 28%", scrub: isMobile ? .5 : .8 } });
        timeline
          .fromTo(faqMedia, { xPercent: isMobile ? 0 : 18, yPercent: 34, z: 150, scale: 1.09 }, { xPercent: 0, yPercent: 0, z: 0, scale: 1, force3D: true, ease: "none", duration: .78 }, 0)
          .fromTo(faqTitle, { yPercent: 16, autoAlpha: .42 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .54 }, .08)
          .fromTo(faqList, { yPercent: 9, autoAlpha: .48 }, { yPercent: 0, autoAlpha: 1, ease: "none", duration: .6 }, .18);
      }

      const cta = root.querySelector<HTMLElement>(".pvh-cta");
      if (cta) {
        const ctaTitle = cta.querySelector<HTMLElement>("h2");
        const ctaBody = cta.querySelector<HTMLElement>("p");
        const ctaActions = cta.querySelector<HTMLElement>(".pvh-actions");
        const ctaMark = cta.querySelector<HTMLElement>(".pvh-cta-mark");
        const timeline = gsap.timeline({ scrollTrigger: { trigger: cta, start: "top 88%", end: "center 42%", scrub: isMobile ? .6 : 1 } });
        timeline
          .fromTo(ctaTitle, { yPercent: 38, clipPath: "inset(100% 0 0 0)", autoAlpha: .15 }, { yPercent: 0, clipPath: "inset(0% 0 0 0)", autoAlpha: 1, ease: "none", duration: .68 }, 0)
          .fromTo(ctaBody, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: "none", duration: .42 }, .22)
          .fromTo(ctaActions, { y: 45, z: -80, autoAlpha: 0 }, { y: 0, z: 35, autoAlpha: 1, force3D: true, ease: "none", duration: .45 }, .34)
          .fromTo(ctaMark, { xPercent: 18, yPercent: 15, scale: .85, autoAlpha: 0 }, { xPercent: -4, yPercent: -4, scale: 1, autoAlpha: 1, ease: "none", duration: .85 }, 0);
      }

      if (!isMobile) {
        root.querySelectorAll<HTMLElement>("[data-depth]").forEach((element) => {
          if (element.closest(".pvh-intro")) return;
          const depth = Number(element.dataset.depth || .12);
          gsap.fromTo(element, { yPercent: depth * -55 }, { yPercent: depth * 75, ease: "none", scrollTrigger: { trigger: element.closest("section") || element, start: "top bottom", end: "bottom top", scrub: isTablet ? .7 : 1 } });
        });
      }
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh, { passive: true });
    const mediaNodes = root.querySelectorAll("img, video");
    mediaNodes.forEach((node) => {
      node.addEventListener("load", refresh, { once: true });
      node.addEventListener("loadeddata", refresh, { once: true });
    });
    void document.fonts?.ready.then(() => { if (alive) refresh(); });
    requestAnimationFrame(refresh);

    return () => {
      alive = false;
      gsap.ticker.remove(updateLenis);
      gsap.ticker.lagSmoothing(500, 33);
      removePointerMotion();
      window.removeEventListener("resize", refresh);
      mediaNodes.forEach((node) => {
        node.removeEventListener("load", refresh);
        node.removeEventListener("loadeddata", refresh);
      });
      ctx.revert();
      lenis.destroy();
    };
  }, [rootRef, enabled, mediaMode]);
}
