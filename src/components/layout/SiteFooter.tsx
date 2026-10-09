import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";
import type { PublicNavigationItem } from "@/lib/public/readers";

export function SiteFooter({ brand, navigation, settings }: { brand?: PublicBrandSettings; navigation: readonly PublicNavigationItem[]; settings: { name: string; email: string; footerText: string; socialLinks: string; copyright: string; phone: string; location: string } }) {
  const social = settings.socialLinks.split("\n").filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
  const links = navigation.filter((item, index) => item.href !== "/privacy" && navigation.findIndex((candidate) => candidate.href === item.href) === index);
  return <footer className="footer" data-public-footer>
    <div className="footer-heading"><span className="eyebrow">PICVISUAL / BUILT AROUND THE IMAGE</span><h2>Let’s make the next frame matter.</h2></div>
    <div className="footer-contact">
      <p>{settings.footerText}</p>
      <a className="footer-email" href={`mailto:${settings.email}`}>{settings.email}<i>↗</i></a>
    </div>
    <div className="footer-directory">
      <nav className="footer-links" aria-label="Footer navigation">{links.map((item) => <Link key={item.href} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined}>{item.label}<i>↗</i></Link>)}<Link href="/privacy">Privacy<i>↗</i></Link></nav>
      <div className="footer-details">{settings.phone && <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a>}{settings.location && <span>{settings.location}</span>}{social.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}</div>
    </div>
    <div className="footer-mark"><BrandLogo className="footer-logo-image" source={brand?.mainLogo} /></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {settings.copyright || settings.name}</span><span>Independent post-production studio</span></div>
  </footer>;
}
