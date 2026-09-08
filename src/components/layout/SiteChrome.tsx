import { getPublicBrandSettings } from "@/lib/brand/settings";
import { getPublicNavigation, getPublicSiteSettings } from "@/lib/public/readers";
import { publicSiteUrl, jsonLd } from "@/lib/public/seo";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [brand, navigation, footer, settings, url] = await Promise.all([getPublicBrandSettings(), getPublicNavigation(), getPublicNavigation("FOOTER"), getPublicSiteSettings(), publicSiteUrl()]);
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "Organization", name: settings.data.name, url, email: settings.data.email, logo: `${url}/brand/picvisual-logo.png` }) }} /><SiteHeader brand={brand} navigation={navigation.data} cta={{ label: settings.data.ctaLabel, href: settings.data.ctaHref }} />{children}<SiteFooter brand={brand} navigation={footer.data} settings={settings.data} /></>;
}
