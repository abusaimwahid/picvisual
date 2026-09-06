import Link from "next/link";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import type { Project } from "@/content/work";
/* eslint-disable @next/next/no-img-element -- CMS media uses provider-managed runtime URLs. */

export function CaseStudyContent({ project, all }: { project: Project; all: Project[] }) {
  const next = all[(all.findIndex((item) => item.slug === project.slug) + 1) % all.length] ?? project;
  const gallery = project.gallery?.length ? project.gallery : undefined;
  return <main id="main" className="case-study"><section className="case-hero"><div><span className="eyebrow">{project.category.toUpperCase()} / CASE STUDY</span><h1>{project.title}</h1><p>{project.summary}</p></div><ProjectArtwork project={project} label={false} /></section><section className="case-details"><span>Scope</span><p>{project.scope}</p><span>Services</span><p>{project.services.join(" · ")}</p><span>Project note</span><p>Case-study content and media are ready to be replaced with approved PicVisual project material. No campaign claims or outcomes have been fabricated.</p></section><section className="case-gallery">{gallery ? gallery.map((item, index) => item.mediaType === "VIDEO" ? <video key={item.publicUrl} src={item.publicUrl} muted playsInline controls preload="metadata" aria-label={item.alt || item.caption || `Project media ${index + 1}`} /> : <img key={item.publicUrl} src={item.publicUrl} alt={item.alt || item.caption || ""} />) : <><ProjectArtwork project={project} /><div className={`gallery-crop ${project.tone}`}><span>DETAIL / 02</span></div><div className={`gallery-wide ${project.tone}`}><span>FINAL ASSET / 03</span></div></>}</section><Link className="next-project" href={`/work/${next.slug}`}><span>Next project</span><strong>{next.title} <i>↗</i></strong></Link></main>;
}
