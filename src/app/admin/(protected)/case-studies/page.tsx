import { EmptyState, PageHeader } from "@/components/admin/AdminPrimitives";
import { ProjectAdminList, projectAdminWhere, type ProjectAdminFilter } from "@/components/admin/ProjectAdminList";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export default async function CaseStudiesAdminPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="CONTENT / CASE STUDIES" title="Case Studies" /><EmptyState title="Database not configured" description="Set DATABASE_URL to manage Case Studies." /></section>;
  const raw = (await searchParams).filter; const filter: ProjectAdminFilter = ["ALL", "WORK", "CASE_STUDIES", "DRAFT", "PUBLISHED", "ARCHIVED"].includes(raw ?? "") ? raw as ProjectAdminFilter : "CASE_STUDIES";
  const projects = await prisma.project.findMany({ where: projectAdminWhere(filter), include: { thumbnailMedia: true, heroMedia: true }, orderBy: [{ caseStudyOrder: "asc" }, { updatedAt: "desc" }], take: 100 });
  return <section className="admin-content"><PageHeader eyebrow="CONTENT / CASE STUDIES" title="Case Studies" description="Create a Project, enable Case Study, save the draft, preview it, then publish. Published entries appear automatically on the public index." /><div className="admin-card"><ProjectAdminList projects={projects} filter={filter} basePath="/admin/case-studies" /></div></section>;
}
