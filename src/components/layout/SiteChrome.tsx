import { getPublicBrandSettings } from "@/lib/brand/settings";
import { getPublicNavigation, getPublicSiteSettings } from "@/lib/public/readers";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [brand, navigation, settings] = await Promise.all([getPublicBrandSettings(), getPublicNavigation(), getPublicSiteSettings()]);
  return <><SiteHeader brand={brand} navigation={navigation.data} />{children}<SiteFooter brand={brand} navigation={navigation.data} email={settings.data.email} /></>;
}
