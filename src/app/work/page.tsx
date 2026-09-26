import Link from "next/link";
import { pageMetadata } from "@/lib/public/seo";
import { getPageCopy } from "@/lib/public/page-copy";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ProjectArtwork } from "@/components/ui/ProjectArtwork";
import { CmsImage } from "@/components/ui/CmsImage";
import { getPublicProjects } from "@/lib/public/readers";
import { caseStudyHref } from "@/cms/case-studies";
import { DemoPortfolio } from "@/components/public/DemoPortfolio";
import { demoMedia } from "@/content/demo-media";

export async function generateMetadata() { return pageMetadata("work", "Selected Work — PicVisual", "A selection of PicVisual’s image, motion and creative post-production work."); }

export default async function WorkPage() {
  const [{ data: projects }, copy] = await Promise.all([getPublicProjects(), getPageCopy("work")]);
  const lead = projects[0];
  return <SiteChrome><main id="main" className="inner-page work-page">
    <section className="public-inner-hero work-hero" data-public-reveal>
      <div className="public-inner-hero-copy"><span className="eyebrow">WORK</span><h1>{copy.title}</h1><p>{copy.body}</p><Link className="text-link" href="#portfolio">View the portfolio <i>↓</i></Link></div>
      <div className="work-hero-media">{lead ? <Link href={caseStudyHref(lead)} aria-label={`View ${lead.title}`}><ProjectArtwork project={lead} label={false} priority /><span>{lead.category} / {lead.title}</span></Link> : <figure><CmsImage asset={demoMedia.productPolished} priority sizes="(max-width: 800px) 100vw, 58vw" /><figcaption>CONCEPT VISUAL / PRODUCT FINISH</figcaption></figure>}</div>
    </section>
    <div id="portfolio">{projects.length > 0 ? <section className="archive" aria-label="Published work">{projects.map((project, index) => <Link key={project.slug} className={`archive-item archive-${index}`} href={caseStudyHref(project)} data-public-reveal><ProjectArtwork project={project} priority={index === 0} /><div><span>{project.category} — {project.scope}</span><h2>{project.title}</h2><p>{project.summary}</p><b>{project.isCaseStudy ? "View Case Study" : "View Project"} <i>↗</i></b></div></Link>)}</section> : <DemoPortfolio />}</div>
    {projects.some((project) => project.isCaseStudy) && <section className="work-case-study-link" data-public-reveal><span>DEEPER STORIES</span><h2>See the thinking behind the finish.</h2><Link className="text-link dark" href="/case-studies">View Case Studies <i>↗</i></Link></section>}
    <section className="portfolio-end" data-public-reveal><span className="eyebrow">YOUR NEXT RELEASE</span><h2>Bring the next visual system into focus.</h2><Link className="button" href="/contact">Start a Project <i>↗</i></Link></section>
  </main></SiteChrome>;
}
