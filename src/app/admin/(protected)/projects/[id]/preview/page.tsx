import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStudyContent } from "@/components/work/CaseStudyContent";
import { mapProjectToPublicProject } from "@/lib/adapters/public-content";
import { requireUser } from "@/lib/auth/auth";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/permissions";

export const metadata = { robots: { index: false, follow: false } };
export default async function ProjectPreview({ params }: { params: Promise<{ id: string }> }) {
  requirePermission(await requireUser(), "editContent"); if (!hasDatabaseUrl()) notFound();
  const project = await prisma.project.findUnique({ where: { id: (await params).id }, include: { thumbnailMedia: { select: { publicUrl: true, alt: true, focalX: true, focalY: true } }, media: { include: { media: { select: { publicUrl: true, mediaType: true, alt: true } } }, orderBy: { order: "asc" } } } });
  if (!project) notFound(); const content = mapProjectToPublicProject(project);
  return <section className="admin-preview-page"><div className="admin-preview-banner"><strong>Project preview</strong><span>This private view is not published or indexed.</span><Link href={`/admin/projects/${project.id}`}>Exit preview</Link></div><CaseStudyContent project={content} all={[content]} /></section>;
}
