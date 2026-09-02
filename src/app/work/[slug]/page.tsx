import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { getProject, projects } from "@/content/work";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { getPublicProjectBySlug, getPublicProjects } from "@/lib/public/readers";

export function generateStaticParams() { return projects.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const project = (await getPublicProjectBySlug((await params).slug)).data; return project ? { title: `${project.title} — PicVisual`, description: project.summary } : {}; }
export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) { const project = (await getPublicProjectBySlug((await params).slug)).data; if (!project) notFound(); const all = (await getPublicProjects()).data; const next = all[(all.findIndex((item) => item.slug === project.slug) + 1) % all.length] ?? projects[0]; return <SiteChrome><main id="main" className="case-study"><section className="case-hero"><div><span className="eyebrow">{project.category.toUpperCase()} / CASE STUDY</span><h1>{project.title}</h1><p>{project.summary}</p></div><ProjectArtwork project={project} label={false} /></section><section className="case-details"><span>Scope</span><p>{project.scope}</p><span>Services</span><p>{project.services.join(" · ")}</p><span>Project note</span><p>Case-study content and media are ready to be replaced with approved PicVisual project material. No campaign claims or outcomes have been fabricated.</p></section><section className="case-gallery"><ProjectArtwork project={project} /><div className={`gallery-crop ${project.tone}`}><span>DETAIL / 02</span></div><div className={`gallery-wide ${project.tone}`}><span>FINAL ASSET / 03</span></div></section><Link className="next-project" href={`/work/${next.slug}`}><span>Next project</span><strong>{next.title} <i>↗</i></strong></Link></main></SiteChrome>; }
