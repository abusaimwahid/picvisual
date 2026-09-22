import Link from "next/link";
import type { Media, Project } from "@prisma/client";
import { archiveSavedProject, publishSavedProject, updateCaseStudyOrder } from "@/app/admin/actions";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { EmptyState, StatusBadge } from "./AdminPrimitives";
import { CmsImage } from "@/components/ui/CmsImage";

export type ProjectAdminFilter = "ALL" | "WORK" | "CASE_STUDIES" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
type AdminProject = Project & { thumbnailMedia: Media | null; heroMedia: Media | null };
const filters: Array<[ProjectAdminFilter, string]> = [["ALL", "All"], ["WORK", "Work"], ["CASE_STUDIES", "Case Studies"], ["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["ARCHIVED", "Archived"]];

export function projectAdminWhere(filter: ProjectAdminFilter) {
  if (filter === "WORK") return { isCaseStudy: false };
  if (filter === "CASE_STUDIES") return { isCaseStudy: true };
  if (filter === "DRAFT" || filter === "PUBLISHED" || filter === "ARCHIVED") return { status: filter };
  return {};
}

export function ProjectAdminList({ projects, filter, basePath = "/admin/projects" }: { projects: AdminProject[]; filter: ProjectAdminFilter; basePath?: string }) {
  return <>
    <nav className="admin-list-filters" aria-label="Project filters">{filters.map(([value, label]) => <Link key={value} href={`${basePath}?filter=${value}`} aria-current={filter === value ? "page" : undefined}>{label}</Link>)}</nav>
    {projects.length ? <div className="admin-record-list admin-project-list">{projects.map((project) => {
      const thumbnail = project.thumbnailMedia ?? project.heroMedia;
      return <article key={project.id}>
        <div className="admin-project-thumbnail">{thumbnail ? <CmsImage asset={thumbnail} sizes="88px" /> : <span>No thumbnail</span>}</div>
        <div className="admin-project-summary"><strong>{project.title}</strong><span>/{project.slug} · {project.isCaseStudy ? "Case Study" : "Work"} · {project.featured ? "Featured" : "Not featured"}{project.isCaseStudy ? ` · Case Study order ${project.caseStudyOrder ?? "not set"}` : ""}</span><small>Updated {project.updatedAt.toLocaleString()}{project.publishedAt ? ` · Last published ${project.publishedAt.toLocaleString()}` : " · Never published"}</small></div>
        <StatusBadge value={project.status} />
        <div className="admin-project-actions"><Link href={`/admin/projects/${project.id}`}>Edit</Link><Link href={`/admin/projects/${project.id}/preview`} target="_blank">Preview ↗</Link>
          {project.isCaseStudy && <form action={updateCaseStudyOrder} className="admin-order-form"><input type="hidden" name="id" value={project.id} /><label>Order<input type="number" name="order" min="0" max="9999" defaultValue={project.caseStudyOrder ?? 0} /></label><button>Save draft order</button></form>}
          {project.status !== "PUBLISHED" && <form><input type="hidden" name="id" value={project.id} /><ConfirmActionButton action={publishSavedProject} message="Publish this saved draft? This will update the public website.">Publish</ConfirmActionButton></form>}
          {project.status !== "ARCHIVED" && <form><input type="hidden" name="id" value={project.id} /><ConfirmActionButton className="admin-danger" action={archiveSavedProject} message="Archive this project? If it is published, it will disappear from the public Work and Case Studies pages after this action completes.">Archive</ConfirmActionButton></form>}
        </div>
      </article>;
    })}</div> : <EmptyState title={filter === "CASE_STUDIES" ? "No Case Studies yet" : "No projects match this filter"} description={filter === "CASE_STUDIES" ? "Create a Project and enable Case Study." : "Choose another filter or create a new project draft."} />}
  </>;
}
