import { pageMetadata } from "@/lib/public/seo";
import Link from "next/link";
import { getPageCopy } from "@/lib/public/page-copy";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { getPublicProjects } from "@/lib/public/readers";
import { caseStudyHref } from "@/cms/case-studies";
import { DemoPortfolio } from "@/components/public/DemoPortfolio";

export async function generateMetadata() { return pageMetadata("work", "Selected Work — PicVisual", "A selection of PicVisual’s image, motion and creative post-production work."); }
export default async function WorkPage() { const [{ data: projects }, copy] = await Promise.all([getPublicProjects(), getPageCopy("work")]); return <SiteChrome><main id="main" className="inner-page"><section className="page-intro page-intro-work"><span className="eyebrow">SELECTED WORK / PICVISUAL</span><h1>{copy.title}</h1><p>{copy.body}</p></section>{!projects.length && <DemoPortfolio />}{projects.length > 0 && <section className="archive">{projects.map((project, index) => <Link key={project.slug} className={`archive-item archive-${index}`} href={caseStudyHref(project)}><ProjectArtwork project={project} priority={index === 0} /><div><span>{project.category} — {project.scope}</span><h2>{project.title}</h2><p>{project.summary}</p><b>{project.isCaseStudy ? "View Case Study" : "View Project"} <i>↗</i></b></div></Link>)}</section>}{projects.some((project) => project.isCaseStudy) && <section className="work-case-study-link"><span>DEEPER STORIES</span><h2>See the thinking behind the finish.</h2><Link className="text-link dark" href="/case-studies">View Case Studies <i>↗</i></Link></section>}</main></SiteChrome>; }
