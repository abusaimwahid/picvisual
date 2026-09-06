import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { projects } from "@/content/work";
import { CaseStudyContent } from "@/components/work/CaseStudyContent";
import { getPublicProjectBySlug, getPublicProjects } from "@/lib/public/readers";

export function generateStaticParams() { return projects.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const project = (await getPublicProjectBySlug((await params).slug)).data; return project ? { title: `${project.title} — PicVisual`, description: project.summary } : {}; }
export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) { const project = (await getPublicProjectBySlug((await params).slug)).data; if (!project) notFound(); return <SiteChrome><CaseStudyContent project={project} all={(await getPublicProjects()).data} /></SiteChrome>; }
