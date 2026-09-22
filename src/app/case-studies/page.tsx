import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { getPublicCaseStudies } from "@/lib/public/readers";
import { pageMetadata } from "@/lib/public/seo";
import { getPageCopy } from "@/lib/public/page-copy";

export async function generateMetadata() { return pageMetadata("case-studies", "Case Studies — PicVisual", "A closer look at how PicVisual approaches image, motion and commercial post-production."); }

export default async function CaseStudiesPage() {
  const [studies, copy] = await Promise.all([(await getPublicCaseStudies()).data, getPageCopy("case-studies")]);
  return <SiteChrome><main id="main" className="case-index"><section className="case-index-hero"><span className="eyebrow">CASE STUDIES</span><h1>{copy.title}</h1><p>{copy.body}</p></section>{studies.length > 0 ? <section className={`case-index-stories count-${studies.length}`}>{studies.map((project, index) => <Link className={`case-index-story story-${index + 1}`} href={`/case-studies/${project.slug}`} key={project.slug}><ProjectArtwork project={project} priority={index === 0} /><div><span>{index === 0 ? "FEATURED CASE STUDY" : project.category.toUpperCase()}</span><h2>{project.title}</h2><p>{project.summary}</p><b>View Case Study <i>↗</i></b></div></Link>)}</section> : <section className="case-index-empty"><span>EDITORIAL STORIES</span><h2>Case studies will appear as projects are published.</h2><p>Each story will document the brief, the finishing decisions and the system behind the final delivery.</p><Link className="button" href="/contact">Start a Project ↗</Link></section>}<section className="case-index-cta"><span className="eyebrow">START A CONVERSATION</span><h2>{copy.approachHeading}</h2><p>{copy.approachBody}</p><Link className="button button-light" href="/contact">Start a Project ↗</Link></section></main></SiteChrome>;
}
