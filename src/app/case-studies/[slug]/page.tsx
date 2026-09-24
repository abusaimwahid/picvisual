import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { publicSiteUrl, defaultSocialImage, jsonLd } from "@/lib/public/seo";
import { CaseStudyContent } from "@/components/work/CaseStudyContent";
import { getPublicCaseStudies } from "@/lib/public/readers";

export async function generateStaticParams() { return (await getPublicCaseStudies()).data.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug; const studies = (await getPublicCaseStudies()).data; const project = studies.find((item) => item.slug === slug);
  if (!project) return { title: "Page not found — PicVisual", description: "This PicVisual page could not be found.", robots: { index: false, follow: false } };
  const title = project.seoTitle || `${project.title} — PicVisual`; const description = project.seoDescription || project.summary; const url = `${await publicSiteUrl()}/case-studies/${project.slug}`; const image = project.ogImage?.publicUrl || project.hero?.publicUrl || await defaultSocialImage();
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, ...(image ? { images: [{ url: image }] } : {}), type: "article" }, twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) } };
}
export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug; const base = await publicSiteUrl(); const studies = (await getPublicCaseStudies()).data; const project = studies.find((item) => item.slug === slug); if (!project) notFound();
  return <SiteChrome><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description: project.summary, url: `${base}/case-studies/${project.slug}`, creator: { "@type": "Organization", name: "PicVisual" }, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Case Studies", item: `${base}/case-studies` }, { "@type": "ListItem", position: 2, name: project.title, item: `${base}/case-studies/${project.slug}` }] } }) }} /><CaseStudyContent project={project} all={studies} /></SiteChrome>;
}
