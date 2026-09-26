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
  return <section className="admin-content">
    <PageHeader eyebrow="SITE / SETTINGS" title="Global Settings" description="Verified business information, contact details, social links and site-wide SEO defaults." />
    <form action={saveSiteSettings} className="admin-settings-workspace">
      <nav className="admin-settings-nav" aria-label="Settings groups"><a href="#settings-general">General</a><a href="#settings-contact">Contact</a><a href="#settings-social">Social</a><a href="#settings-seo">SEO</a></nav>
      <div className="admin-settings-groups">
        <section id="settings-general" className="admin-card admin-content-form"><div className="admin-editor-group-title"><span>GENERAL</span><h2>Site identity</h2><p>Core public-facing business and call-to-action details.</p></div><div className="admin-form-columns"><label>Business display name<input name="siteName" defaultValue={value.name} required /></label><label>Canonical website URL<input name="siteUrl" type="url" defaultValue={value.siteUrl} required /></label><label>Primary CTA label<input name="ctaLabel" defaultValue={value.ctaLabel} required /></label><label>Primary CTA link<input name="ctaHref" defaultValue={value.ctaHref} required /></label></div><label>Footer positioning<textarea name="footerText" rows={3} defaultValue={value.footerText} /></label><label>Copyright wording <small>Optional</small><input name="copyright" defaultValue={value.copyright} /></label></section>
        <section id="settings-contact" className="admin-card admin-content-form"><div className="admin-editor-group-title"><span>CONTACT</span><h2>Public contact details</h2><p>Only add contact details that are verified and ready to publish.</p></div><div className="admin-form-columns"><label>Public email<input name="contactEmail" type="email" defaultValue={value.email} required /></label><label>Phone <small>Optional</small><input name="phone" defaultValue={value.phone} /></label></div><label>Location <small>Optional, verified only</small><input name="location" defaultValue={value.location} /></label></section>
        <section id="settings-social" className="admin-card admin-content-form"><div className="admin-editor-group-title"><span>SOCIAL</span><h2>Social profiles</h2><p>One platform and HTTPS URL per line.</p></div><label>Social links <small>Example: Instagram | https://instagram.com/picvisual</small><textarea name="socialLinks" rows={6} defaultValue={value.socialLinks} /></label></section>
        <section id="settings-seo" className="admin-card admin-content-form"><div className="admin-editor-group-title"><span>SEO</span><h2>Search and sharing defaults</h2><p>Pages with their own metadata override these defaults.</p></div><label>Default SEO title<input name="seoTitle" defaultValue={value.seoTitle} /></label><label>Default SEO description<textarea name="description" rows={4} defaultValue={value.description} required /></label><MediaPicker name="ogImageId" label="Default social image" accept="IMAGE" selectedId={value.ogImageId} items={media} /></section>
      </div>
      <div className="admin-sticky-actions"><span><strong>Global settings</strong><small>Changes affect site-wide defaults after saving.</small></span><button>Save settings</button></div>
    </form>
  </section>;
}
