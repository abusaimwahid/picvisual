import type { Project } from "@/content/work";
import { CmsImage } from "./CmsImage";

export function ProjectArtwork({ project, label = true, priority = false }: { project: Project; label?: boolean; priority?: boolean }) {
  return <div className={`project-art ${project.tone} ${project.size} ${project.thumbnail ? "has-media" : ""}`}>
    {project.thumbnail ? <CmsImage asset={project.thumbnail} alt={project.thumbnail.alt || project.title} priority={priority} sizes="(max-width: 768px) 100vw, 60vw" /> : <><div className="art-grain" /><div className="art-orb" /><div className="art-shadow" /><div className="art-object" /><div className="art-line line-one" /><div className="art-line line-two" /></>}
    {label && <div className="art-meta"><span>PV/ {project.category.toUpperCase()}</span><span>{project.services[0]}</span></div>}
  </div>;
}
