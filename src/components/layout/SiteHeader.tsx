"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";

type NavigationItem = { label: string; href: string; openInNewTab?: boolean };

export function SiteHeader({
  brand,
  navigation = site.navigation,
  cta = { label: "Start a Project", href: "/contact" },
}: {
  brand?: PublicBrandSettings;
  navigation?: readonly NavigationItem[];
  cta?: { label: string; href: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.current?.style.setProperty("transform", `scaleX(${Math.min(1, Math.max(0, window.scrollY / maximum))})`);
      setScrolled(window.scrollY > 24);
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusable[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => toggle.current?.focus());
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  const isCurrent = (href: string) => href.startsWith("/") && (pathname === href || pathname.startsWith(`${href}/`));
  const close = () => setOpen(false);

  return <>
    <div className="site-scroll-progress" aria-hidden="true"><span ref={progress} /></div>
    <header className={`site-header ${pathname === "/" ? "is-home" : ""} ${scrolled ? "is-scrolled" : ""} ${open ? "menu-is-open" : ""}`}>
      <Link className="site-logo" href="/" aria-label="PicVisual home"><BrandLogo className="site-logo-image" source={brand?.mainLogo} priority /></Link>
      <button ref={toggle} aria-controls="site-navigation" className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
        <span className="menu-toggle-label">{open ? "Close" : "Menu"}</span><i aria-hidden="true"><b /><b /></i>
      </button>
    </header>
    <div className={`menu-backdrop ${open ? "open" : ""}`} aria-hidden="true" onClick={close} />
    <div ref={dialog} id="site-navigation" inert={!open} className={`mobile-menu ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Site navigation" aria-hidden={!open}>
      <div className="menu-kicker"><span>PicVisual / Navigation</span><span>{String(navigation.length).padStart(2, "0")} routes</span></div>
      <nav aria-label="Primary navigation">
        {navigation.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} onClick={close}><small>{String(index + 1).padStart(2, "0")}</small><span>{item.label}</span><i>↗</i></Link>)}
      </nav>
      <div className="menu-footer"><p>Image, motion and commercial post-production.</p><Link className="header-cta" href={cta.href} onClick={close}>{cta.label}<i>↗</i></Link></div>
    </div>
  </>;
}
