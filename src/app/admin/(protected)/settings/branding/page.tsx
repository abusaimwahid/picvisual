import { BrandSettingsForm } from "@/components/admin/BrandSettingsForm";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { requireUser } from "@/lib/auth/auth";
import { getPublicBrandSettings } from "@/lib/brand/settings";
import { requirePermission } from "@/lib/permissions";

export default async function BrandingSettingsPage() { requirePermission(await requireUser(), "manageSettings"); const settings = await getPublicBrandSettings(); return <section className="admin-content"><PageHeader eyebrow="SITE SETTINGS" title="Brand Settings" description="Manage the official logo and brand assets. The public site keeps its official static logo as a safe fallback." /><BrandSettingsForm settings={settings} /></section>; }
