import Link from "next/link";
import { HomePage } from "@/components/home/HomePage";
import { requireUser } from "@/lib/auth/auth";
import { requirePermission } from "@/lib/permissions";
import { getDraftHomeContent } from "@/lib/public/readers";

export const metadata = { robots: { index: false, follow: false } };

export default async function HomepageDraftPreviewPage() {
  requirePermission(await requireUser(), "editContent");
  const content = await getDraftHomeContent();
  return <section className="admin-preview-page"><div className="admin-preview-banner"><strong>Draft preview</strong><span>This private view is not published or indexed.</span><Link href="/admin/homepage">Exit preview</Link></div><HomePage content={content} /></section>;
}
