"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AdminUser } from "@/lib/auth/auth";
import type { PublicBrandSettings } from "@/lib/brand/settings";
import { BrandLogo } from "@/components/ui/BrandLogo";

type NavigationItem = readonly [label: string, href: string, icon: string];
type NavigationGroup = { readonly label: string; readonly items: readonly NavigationItem[] };

const groups = [
  {
    label: "Content",
    items: [
      ["Homepage", "/admin/homepage", "⌂"],
      ["Projects", "/admin/projects", "▧"],
      ["Case Studies", "/admin/case-studies", "◫"],
      ["Services", "/admin/services", "◇"],
      ["Studio / About", "/admin/pages/about", "◩"],
      ["FAQ", "/admin/faq", "?"],
      ["Testimonials", "/admin/testimonials", "“"],
      ["Clients", "/admin/clients", "○"],
    ],
  },
  { label: "Media", items: [["Media Library", "/admin/media", "▦"]] },
  { label: "Inbox", items: [["Enquiries", "/admin/enquiries", "✉"]] },
  {
    label: "Site",
    items: [
      ["Navigation", "/admin/navigation", "↗"],
      ["Global Settings", "/admin/settings", "⚙"],
      ["Branding", "/admin/settings/branding", "◐"],
    ],
  },
  {
    label: "System",
    items: [
      ["Users", "/admin/users", "♙"],
      ["Account", "/admin/account", "◉"],
    ],
  },
] as const satisfies readonly NavigationGroup[];

const allItems = groups.reduce<NavigationItem[]>((items, group) => {
  items.push(...(group.items as readonly NavigationItem[]));
  return items;
}, []);

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  if (href === "/admin/settings") return pathname === href;
  if (href === "/admin/projects") return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminWorkspaceShell({ user, brand, children }: { user: AdminUser; brand?: PublicBrandSettings; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [pathname]);
  const currentTitle = useMemo(() => {
    const matches = allItems.filter(([, href]) => isActive(pathname, href));
    return matches.sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? (pathname === "/admin" ? "Dashboard" : "Admin");
  }, [pathname]);

  return <div className="admin-shell">
    <button className="admin-drawer-scrim" type="button" aria-label="Close navigation" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} data-open={drawerOpen} />
    <aside className="admin-sidebar" data-open={drawerOpen}>
      <div className="admin-sidebar-head">
        <Link href="/admin" className="admin-brand" aria-label="PicVisual CMS dashboard">
          <BrandLogo className="admin-logo-image" source={brand?.mainLogo} />
          <span><b>PicVisual</b><small>CMS</small></span>
        </Link>
        <button type="button" className="admin-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">×</button>
      </div>
      <nav aria-label="Admin navigation">
        <Link className={pathname === "/admin" ? "is-active" : ""} href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}><i>⌘</i><span>Dashboard</span></Link>
        {groups.map((group) => <section key={group.label} className="admin-nav-group">
          <h2>{group.label}</h2>
          {group.items.map(([label, href, icon]) => {
            const active = isActive(pathname, href);
            return <Link className={active ? "is-active" : ""} href={href} key={href} aria-current={active ? "page" : undefined}><i aria-hidden="true">{icon}</i><span>{label}</span></Link>;
          })}
        </section>)}
      </nav>
      <div className="admin-account">
        <span>{user.name || user.email}</span>
        <small>{user.role.toLowerCase()} · signed in</small>
        <form action="/api/admin/auth/logout" method="post"><button>Sign out</button></form>
      </div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <div>
          <button className="admin-drawer-trigger" type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}>☰</button>
          <span className="admin-current-area">{currentTitle}</span>
        </div>
        <div><Link href="/" target="_blank">View public site <span aria-hidden="true">↗</span></Link><span className="admin-topbar-user">{user.email}</span></div>
      </header>
      {children}
    </div>
  </div>;
}
