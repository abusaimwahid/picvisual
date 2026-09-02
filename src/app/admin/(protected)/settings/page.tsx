import { saveSiteSettings } from "@/app/admin/actions";
import { EmptyState, PageHeader } from "@/components/admin/AdminPrimitives";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export default async function SettingsAdminPage() {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="GLOBAL" title="Site settings" description="Brand media remains separately managed in Brand Settings." /><EmptyState title="Database not configured" description="Set DATABASE_URL to manage public site defaults." /></section>;
  const setting = await prisma.siteSetting.findUnique({ where: { key: "global" } }); const value = setting?.value as { siteName?: string; contactEmail?: string; description?: string } | null;
  return <section className="admin-content"><PageHeader eyebrow="GLOBAL" title="Site settings" description="These values supply public defaults, footer contact information, and metadata fallbacks." /><form action={saveSiteSettings} className="admin-card admin-content-form admin-settings-form"><label>Company name<input name="siteName" defaultValue={value?.siteName || "PicVisual"} required /></label><label>Public contact email<input name="contactEmail" type="email" defaultValue={value?.contactEmail || ""} required /></label><label>Default SEO description<textarea name="description" rows={5} defaultValue={value?.description || ""} required /></label><button type="submit">Save settings</button></form></section>;
}
