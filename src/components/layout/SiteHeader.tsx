"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";

export function SiteHeader({ brand, navigation = site.navigation }: { brand?: PublicBrandSettings; navigation?: readonly { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36);
    handleScroll(); window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  return <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
    <Link className="site-logo" href="/" aria-label="PicVisual home"><BrandLogo className="site-logo-image" source={brand?.mainLogo} priority /></Link>
    <nav className="desktop-nav" aria-label="Primary navigation">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <Link className="header-cta desktop-cta" href="/contact">Start a Project <i>↗</i></Link>
    <button className={`menu-toggle ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}><span /><span /></button>
    <div className={`mobile-menu ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="menu-kicker">Navigation <span>00—04</span></div>
      {navigation.map((item, index) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}><small>0{index + 1}</small>{item.label}<i>↗</i></Link>)}
      <Link className="header-cta" href="/contact" onClick={() => setOpen(false)}>Start a Project <i>↗</i></Link>
    </div>
  </header>;
}
