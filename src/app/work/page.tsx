import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { getPublicProjects } from "@/lib/public/readers";

export const metadata: Metadata = { title: "Selected Work — PicVisual", description: "A selection of PicVisual’s image, motion and creative post-production work." };
export default async function WorkPage() { const { data: projects } = await getPublicProjects(); return <SiteChrome><main id="main" className="inner-page"><section className="page-intro page-intro-work"><span className="eyebrow">SELECTED WORK / PICVISUAL</span><h1>Visual work,<br /><em>finished for market.</em></h1><p>Campaign, commerce and editorial post-production—presented as the work itself, with each project retaining its intended media hierarchy.</p></section><section className="archive">{projects.map((project, index) => <Link key={project.slug} className={`archive-item archive-${index}`} href={`/work/${project.slug}`}><ProjectArtwork project={project} /><div><span>{project.category} — {project.scope}</span><h2>{project.title}</h2><p>{project.summary}</p><b>View project <i>↗</i></b></div></Link>)}</section></main></SiteChrome>; }
