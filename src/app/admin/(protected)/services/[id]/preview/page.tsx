import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/client";
import { CmsImage } from "@/components/ui/CmsImage";
export const metadata = { robots: { index: false, follow: false } };
export default async function ServicePreview({ params }: { params: Promise<{ id: string }> }) {
  requirePermission(await requireUser(), "editContent");
  const service = await prisma.service.findUnique({ where: { id: (await params).id }, include: { heroMedia: true } });
  if (!service) notFound();
  return <main id="main" className="inner-page"><div className="admin-preview-banner">Private saved draft <Link href="/admin/services">Exit preview</Link></div><section className="page-intro"><span className="eyebrow">{service.category}</span><h1>{service.title}</h1><p>{service.shortDescription}</p></section>{service.heroMedia && <CmsImage asset={service.heroMedia} />}<ul>{service.description?.split("\n").filter(Boolean).map((item) => <li key={item}>{item}</li>)}</ul></main>;
}
