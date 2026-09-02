import type { Project } from "@/content/work";

export function ProjectArtwork({ project, label = true }: { project: Project; label?: boolean }) {
  return <div className={`project-art ${project.tone} ${project.size}`} aria-label={`${project.title} placeholder artwork`} role="img">
    <div className="art-grain" /><div className="art-orb" /><div className="art-shadow" /><div className="art-object" /><div className="art-line line-one" /><div className="art-line line-two" />
    {label && <div className="art-meta"><span>PV/ {project.category.toUpperCase()}</span><span>FRAME 01</span></div>}
  </div>;
}
