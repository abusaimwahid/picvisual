import { prisma } from "@/lib/db/client";
import { BrandSettingsForm } from "@/components/admin/BrandSettingsForm";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { requireUser } from "@/lib/auth/auth";
import { getPublicBrandSettings } from "@/lib/brand/settings";
import { requirePermission } from "@/lib/permissions";

export default async function BrandingSettingsPage() { requirePermission(await requireUser(), "manageSettings"); const [settings, media] = await Promise.all([getPublicBrandSettings(), prisma.media.findMany({ where: { mediaType: "IMAGE" }, take: 120, orderBy: { createdAt: "desc" } })]); return <section className="admin-content"><PageHeader eyebrow="SITE SETTINGS" title="Brand Settings" description="Manage the official logo and brand assets. The public site keeps its official static logo as a safe fallback." /><BrandSettingsForm settings={settings} media={media} /></section>; }
