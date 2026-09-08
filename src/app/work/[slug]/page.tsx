import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { publicSiteUrl, defaultSocialImage, jsonLd } from "@/lib/public/seo";
import { CaseStudyContent } from "@/components/work/CaseStudyContent";
import { getPublicProjectBySlug, getPublicProjects } from "@/lib/public/readers";

export async function generateStaticParams() { return (await getPublicProjects()).data.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = (await getPublicProjectBySlug((await params).slug)).data; if (!project) return { robots: { index: false, follow: false } };
  const title = project.seoTitle || `${project.title} — PicVisual`; const description = project.seoDescription || project.summary; const url = `${await publicSiteUrl()}/work/${project.slug}`; const image = project.ogImage?.publicUrl || project.hero?.publicUrl || await defaultSocialImage();
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: [{ url: image }], type: "article" }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}
export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) { const project = (await getPublicProjectBySlug((await params).slug)).data; if (!project) notFound(); return <SiteChrome><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description: project.summary, url: `${await publicSiteUrl()}/work/${project.slug}`, creator: { "@type": "Organization", name: "PicVisual" } }) }} /><CaseStudyContent project={project} all={(await getPublicProjects()).data} /></SiteChrome>; }
