import Link from "next/link";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { MediaVideo } from "@/components/ui/MediaVideo";
import { CmsImage } from "@/components/ui/CmsImage";
import { BeforeAfter } from "./BeforeAfter";
import type { Project } from "@/content/work";
import { caseStudyHref, nextCaseStudy } from "@/cms/case-studies";

function StorySection({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string | null }) {
  if (!body) return null;
  return <section className="case-story" data-public-reveal><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><div>{body.split(/\n\s*\n/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>;
}

export function CaseStudyContent({ project, all, preview = false }: { project: Project; all: Project[]; preview?: boolean }) {
  const next = project.isCaseStudy ? nextCaseStudy(all, project.slug) : undefined;
  const gallery = project.gallery?.filter((item) => item.publicUrl !== project.hero?.publicUrl) ?? [];
  const metadata = [project.clientName && ["Client", project.clientName], project.year && ["Year", String(project.year)], project.services.length && ["Services", project.services.join(" · ")]].filter(Boolean) as string[][];
  return <main id="main" className="case-study">
    <section className="case-hero" data-public-reveal><div className="case-hero-copy"><span className="eyebrow">{project.eyebrow || `${project.category.toUpperCase()} / CASE STUDY`}</span><h1>{project.title}</h1><p>{project.intro || project.summary}</p>{metadata.length > 0 && <dl>{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</div><ProjectArtwork project={{ ...project, thumbnail: project.hero ?? project.thumbnail }} label={false} priority /></section>
    {project.description && <StorySection eyebrow="01 — OVERVIEW" title="The project" body={project.description} />}
    {project.challenge && <StorySection eyebrow="02 — CONTEXT" title="Challenge / context" body={project.challenge} />}
    {project.approach && <StorySection eyebrow="03 — APPROACH" title="The approach" body={project.approach} />}
    {project.before && project.after && <section className="case-comparison-section" data-public-reveal><header><span className="eyebrow">BEFORE / AFTER</span><h2>Move between source and finish.</h2></header><BeforeAfter before={project.before} after={project.after} /></section>}
    {project.video && <section className="case-video" data-public-reveal><span className="eyebrow">MOTION</span><MediaVideo src={project.video.publicUrl} poster={project.poster?.publicUrl} label={project.video.alt || `${project.title} video`} /></section>}
    {gallery.length > 0 && <section className="case-gallery" aria-label="Project gallery" data-public-reveal>{gallery.map((item, index) => <figure key={`${item.publicUrl}-${index}`} className={`case-gallery-${(item.layout || (item.role === "DETAIL" ? "DETAIL" : "LANDSCAPE")).toLowerCase().replaceAll("_", "-")}`}>{item.mediaType === "VIDEO" ? <MediaVideo src={item.publicUrl} label={item.alt || item.caption || `Project film ${index + 1}`} /> : <CmsImage asset={item} alt={item.alt || item.caption || `${project.title}, image ${index + 1}`} sizes="(max-width: 800px) 100vw, 88vw" />}{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</section>}
    {project.productionNotes && <StorySection eyebrow="04 — PRODUCTION NOTES" title="Details in the finish" body={project.productionNotes} />}
    {project.outcome && <StorySection eyebrow="05 — OUTCOME" title="The finished work" body={project.outcome} />}
    <section className="case-end" data-public-reveal><span className="eyebrow">CONTINUE</span><Link className="next-project" href={preview ? `/admin/projects/${project.id}` : next ? caseStudyHref(next) : "/work"}><span>{preview ? "Exit preview" : next ? "Next case study" : "Explore the portfolio"}</span><strong>{preview ? "Back to editor" : next?.title ?? "More work"} <i>↗</i></strong></Link><Link className="button" href="/contact">Start a Project ↗</Link></section>
  </main>;
}
