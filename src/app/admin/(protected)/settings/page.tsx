import { saveSiteSettings } from "@/app/admin/actions";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { getPublicSiteSettings } from "@/lib/public/readers";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/permissions";
import { requireUser } from "@/lib/auth/auth";
export default async function SettingsAdminPage() {
  requirePermission(await requireUser(), "manageSettings");
  const { data: value } = await getPublicSiteSettings();
  const media = await prisma.media.findMany({ where: { mediaType: "IMAGE" }, take: 120, orderBy: { createdAt: "desc" } });
  return <section className="admin-content"><PageHeader eyebrow="GLOBAL" title="Site settings" description="Manage verified business information, navigation CTA and SEO defaults." /><form action={saveSiteSettings} className="admin-card admin-content-form admin-settings-form">
    {[["siteName", "Business display name", value.name], ["contactEmail", "Public email", value.email], ["siteUrl", "Canonical website URL (HTTPS)", value.siteUrl], ["ctaLabel", "Primary CTA label", value.ctaLabel], ["ctaHref", "Primary CTA link", value.ctaHref], ["phone", "Phone (optional)", value.phone], ["location", "Location (verified only)", value.location], ["seoTitle", "Default SEO title", value.seoTitle], ["copyright", "Copyright wording (optional)", value.copyright]].map(([name, label, defaultValue]) => <label key={name}>{label}<input name={name} defaultValue={defaultValue} required={["siteName", "contactEmail", "siteUrl", "ctaLabel", "ctaHref"].includes(name)} /></label>)}
    <label>Default SEO description<textarea name="description" rows={4} defaultValue={value.description} required /></label><label>Footer positioning<textarea name="footerText" rows={3} defaultValue={value.footerText} /></label><label>Social links <small>One Label | https://URL per line</small><textarea name="socialLinks" rows={4} defaultValue={value.socialLinks} /></label><MediaPicker name="ogImageId" label="Default social image" accept="IMAGE" selectedId={value.ogImageId} items={media} /><button>Save settings</button>
  </form></section>;
}
