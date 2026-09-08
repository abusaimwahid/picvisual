"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { site } from "@/content/site";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";

export function SiteHeader({ brand, navigation = site.navigation, cta = { label: "Start a Project", href: "/contact" } }: { brand?: PublicBrandSettings; navigation?: readonly { label: string; href: string; openInNewTab?: boolean }[]; cta?: { label: string; href: string } }) {
  const menu = useRef<HTMLDivElement>(null); const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36);
    handleScroll(); window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => {
    if (!open) return;
    const links = menu.current?.querySelectorAll<HTMLAnchorElement>("a"); links?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab" && links?.length) {
        const first = links[0], last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open]);
  return <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
    <Link className="site-logo" href="/" aria-label="PicVisual home"><BrandLogo className="site-logo-image" source={brand?.mainLogo} priority /></Link>
    <nav className="desktop-nav" aria-label="Primary navigation">{navigation.map((item) => <Link key={item.href} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined}>{item.label}</Link>)}</nav>
    <Link className="header-cta desktop-cta" href={cta.href}>{cta.label} <i>↗</i></Link>
    <button ref={toggle} aria-controls="mobile-navigation" className={`menu-toggle ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}><span /><span /></button>
    <div ref={menu} id="mobile-navigation" inert={!open} className={`mobile-menu ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="menu-kicker">Navigation <span>00—04</span></div>
      {navigation.map((item, index) => <Link key={item.href} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} onClick={() => setOpen(false)}><small>0{index + 1}</small>{item.label}<i>↗</i></Link>)}
      <Link className="header-cta" href={cta.href} onClick={() => setOpen(false)}>{cta.label} <i>↗</i></Link>
    </div>
  </header>;
}
