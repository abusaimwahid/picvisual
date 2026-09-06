import Link from "next/link";
import { site } from "@/content/site";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";

export function SiteFooter({ brand, navigation = site.navigation, email = site.email }: { brand?: PublicBrandSettings; navigation?: readonly { label: string; href: string }[]; email?: string }) {
  return <footer className="footer">
    <div className="footer-top"><div><span className="eyebrow">PICVISUAL / POST-PRODUCTION</span><p>Image + video finishing<br />for brands and creative teams.</p></div><a className="footer-email" href={`mailto:${email}`}>{email} <i>↗</i></a></div>
    <div className="footer-links">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}<i>↗</i></Link>)}</div>
    <div className="footer-mark"><BrandLogo className="footer-logo-image" source={brand?.mainLogo} /></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} PicVisual</span><span>Built around the image.</span></div>
  </footer>;
}
