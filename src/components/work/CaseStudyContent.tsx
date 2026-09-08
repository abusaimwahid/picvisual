import Link from "next/link";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { MediaVideo } from "@/components/ui/MediaVideo";
import { CmsImage } from "@/components/ui/CmsImage";
import { BeforeAfter } from "./BeforeAfter";
import type { Project } from "@/content/work";

export function CaseStudyContent({ project, all }: { project: Project; all: Project[] }) {
  const index = all.findIndex((item) => item.slug === project.slug);
  const next = all.length > 1 ? all[(index + 1) % all.length] : undefined;
  return <main id="main" className="case-study">
    <section className="case-hero"><div><span className="eyebrow">{project.category.toUpperCase()} / SELECTED WORK</span><h1>{project.title}</h1><p>{project.summary}</p></div><ProjectArtwork project={{ ...project, thumbnail: project.hero ?? project.thumbnail }} label={false} priority /></section>
    <section className="case-details">{project.description && <><h2>Scope</h2><p>{project.description}</p></>}{project.services.length > 0 && <><h2>Services</h2><p>{project.services.join(" · ")}</p></>}{project.clientName && <><h2>Client</h2><p>{project.clientName}</p></>}{project.year && <><h2>Year</h2><p>{project.year}</p></>}</section>
    {project.before && project.after && <BeforeAfter before={project.before} after={project.after} />}
    {project.video && <section className="case-video"><MediaVideo src={project.video.publicUrl} poster={project.poster?.publicUrl} label={project.video.alt || `${project.title} video`} /></section>}
    {!!project.gallery?.length && <section className="case-gallery" aria-label="Project gallery">{project.gallery.map((item, index) => <figure key={`${item.publicUrl}-${index}`} className={item.role === "DETAIL" ? "case-detail-image" : undefined}>{item.mediaType === "VIDEO" ? <MediaVideo src={item.publicUrl} label={item.alt || item.caption || `Project film ${index + 1}`} /> : <CmsImage asset={item} alt={item.alt || item.caption || `${project.title}, image ${index + 1}`} />}{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</section>}
    <Link className="next-project" href={next ? `/work/${next.slug}` : "/contact"}><span>{next ? "Next project" : "Have a similar brief?"}</span><strong>{next?.title ?? "Start a project"} <i>↗</i></strong></Link>
  </main>;
}
