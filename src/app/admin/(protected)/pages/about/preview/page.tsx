import Link from "next/link";
import { StudioContent } from "@/components/about/StudioContent";
import { getDraftAboutContent } from "@/lib/public/readers";
import { requireUser } from "@/lib/auth/auth";
import { requirePermission } from "@/lib/permissions";

export const metadata = { robots: { index: false, follow: false } };
export default async function AboutDraftPreview() {
  requirePermission(await requireUser(), "editContent");
  const studio = await getDraftAboutContent();
  return <section className="admin-preview-page"><div className="admin-preview-banner"><strong>Studio Draft Preview</strong><span>Private, authenticated and excluded from indexing.</span><Link href="/admin/pages/about">Exit preview</Link></div><StudioContent content={studio.content} enabled={studio.enabled} order={studio.order} media={studio.media} services={studio.services} /></section>;
}
