import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { CmsImage } from "@/components/ui/CmsImage";
import { getPublicCaseStudies } from "@/lib/public/readers";
import { pageMetadata } from "@/lib/public/seo";
import { getPageCopy } from "@/lib/public/page-copy";
import { DemoPortfolio } from "@/components/public/DemoPortfolio";
import { demoMedia } from "@/content/demo-media";

export async function generateMetadata() { return pageMetadata("case-studies", "Case Studies — PicVisual", "A closer look at how PicVisual approaches image, motion and commercial post-production."); }

export default async function CaseStudiesPage() {
  const [studies, copy] = await Promise.all([(await getPublicCaseStudies()).data, getPageCopy("case-studies")]);
  const lead = studies[0];
  return <SiteChrome><main id="main" className="case-index">
    <section className="public-inner-hero case-index-hero" data-public-reveal><div className="public-inner-hero-copy"><span className="eyebrow">CASE STUDIES</span><h1>{copy.title}</h1><p>{copy.body}</p></div><div className="case-index-hero-media">{lead ? <ProjectArtwork project={{ ...lead, thumbnail: lead.hero ?? lead.thumbnail }} label={false} priority /> : <figure><CmsImage asset={demoMedia.creativeMaterial} priority sizes="(max-width: 800px) 100vw, 58vw" /><figcaption>CONCEPT VISUAL / COMPOSITING STUDY</figcaption></figure>}</div></section>
    {studies.length > 0 ? <section className={`case-index-stories count-${studies.length}`}>{studies.map((project, index) => <Link className={`case-index-story story-${index + 1}`} href={`/case-studies/${project.slug}`} key={project.slug} data-public-reveal><ProjectArtwork project={project} priority={index === 0} /><div><span>{index === 0 ? "FEATURED CASE STUDY" : project.category.toUpperCase()}</span><h2>{project.title}</h2><p>{project.summary}</p><b>View Case Study <i>↗</i></b></div></Link>)}</section> : <section className="case-sample-intro" data-public-reveal><span>EDITORIAL STORIES / IN PREPARATION</span><h2>Process-led stories, presented without invented clients or results.</h2><p>Until approved case studies are published, these concept visuals demonstrate the intended editorial scale and visual rhythm.</p></section>}
    {!studies.length && <DemoPortfolio compact />}
    <section className="case-index-cta" data-public-reveal><span className="eyebrow">START A CONVERSATION</span><h2>{copy.approachHeading}</h2><p>{copy.approachBody}</p><Link className="button button-light" href="/contact">Start a Project ↗</Link></section>
  </main></SiteChrome>;
}
