import { pageMetadata } from "@/lib/public/seo";
import Link from "next/link";
import { getPageCopy } from "@/lib/public/page-copy";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { getPublicProjects } from "@/lib/public/readers";

export async function generateMetadata() { return pageMetadata("work", "Selected Work — PicVisual", "A selection of PicVisual’s image, motion and creative post-production work."); }
export default async function WorkPage() { const [{ data: projects }, copy] = await Promise.all([getPublicProjects(), getPageCopy("work")]); return <SiteChrome><main id="main" className="inner-page"><section className="page-intro page-intro-work"><span className="eyebrow">SELECTED WORK / PICVISUAL</span><h1>{copy.title}</h1><p>{copy.body}</p></section>{!projects.length && <section className="inline-cta"><p>Looking for work relevant to your brief?</p><Link className="button" href="/contact">Discuss your project ↗</Link></section>}<section className="archive">{projects.map((project, index) => <Link key={project.slug} className={`archive-item archive-${index}`} href={`/work/${project.slug}`}><ProjectArtwork project={project} /><div><span>{project.category} — {project.scope}</span><h2>{project.title}</h2><p>{project.summary}</p><b>View project <i>↗</i></b></div></Link>)}</section></main></SiteChrome>; }
