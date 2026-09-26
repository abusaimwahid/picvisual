"use client";

import { useEffect } from "react";

export function PublicPageMotion() {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-public-reveal]")];
    if (!elements.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-public-visible"));
      return;
    }
    document.documentElement.classList.add("public-motion-ready");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-public-visible");
      observer.unobserve(entry.target);
    }), { threshold: .08, rootMargin: "0px 0px -8%" });
    elements.forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); document.documentElement.classList.remove("public-motion-ready"); };
  }, []);
  return null;
}
