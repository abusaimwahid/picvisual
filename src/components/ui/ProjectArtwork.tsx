import type { Project } from "@/content/work";
/* eslint-disable @next/next/no-img-element -- CMS media uses provider-managed runtime URLs. */

export function ProjectArtwork({ project, label = true }: { project: Project; label?: boolean }) {
  return <div className={`project-art ${project.tone} ${project.size} ${project.thumbnail ? "has-media" : ""}`} aria-label={project.thumbnail ? project.thumbnail.alt || project.title : `${project.title} placeholder artwork`} role="img">
    {project.thumbnail && <img src={project.thumbnail.publicUrl} alt="" style={{ objectPosition: `${project.thumbnail.focalX ?? 50}% ${project.thumbnail.focalY ?? 50}%` }} />}
    <div className="art-grain" /><div className="art-orb" /><div className="art-shadow" /><div className="art-object" /><div className="art-line line-one" /><div className="art-line line-two" />
    {label && <div className="art-meta"><span>PV/ {project.category.toUpperCase()}</span><span>FRAME 01</span></div>}
  </div>;
}
