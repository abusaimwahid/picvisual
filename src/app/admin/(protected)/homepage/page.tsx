import Link from "next/link";
import { addHomeSection, deleteHomeSection, duplicateHomeSection, moveHomeSection, saveHomepageBuilderSection } from "@/app/admin/actions";
import { EmptyState, PageHeader } from "@/components/admin/AdminPrimitives";
import { HomeSectionActions } from "@/components/admin/HomeSectionActions";
import { HomeSectionEditor } from "@/components/admin/HomeSectionEditor";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { sectionRegistry } from "@/cms/section-registry";
import { protectedHomepageSectionTypes } from "@/cms/homepage-editor";

const prettify = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

export default async function HomepageAdminPage() {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" description="The existing public homepage stays on its verified fallback until a database is configured." /><EmptyState title="Database not configured" description="Set DATABASE_URL to use the protected homepage builder. No content migration has been run." /></section>;
  const [page, media, services, projects, faqs] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } } } }),
    prisma.media.findMany({ select: { id: true, filename: true, publicUrl: true, mediaType: true, alt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.service.findMany({ select: { id: true, title: true, category: true }, orderBy: { title: "asc" } }),
    prisma.project.findMany({ select: { id: true, title: true, category: true }, orderBy: { updatedAt: "desc" } }),
    prisma.fAQ.findMany({ select: { id: true, question: true }, where: { pageKey: "home" }, orderBy: { order: "asc" } }),
  ]);
  if (!page) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" /><EmptyState title="Homepage not seeded" description="Run the approved seed workflow after configuring the database." /></section>;
  const options = { services: services.map((service) => ({ id: service.id, label: service.title, detail: service.category })), projects: projects.map((project) => ({ id: project.id, label: project.title, detail: project.category })), faqs: faqs.map((faq) => ({ id: faq.id, label: faq.question })) };
  return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" description="Manage the existing homepage sections, their visibility and their persistent order. Changes are validated server-side before the public cache is refreshed." />
    <div className="admin-home-actions"><Link href="/" target="_blank">View published homepage ↗</Link><span>Draft/publish and secure draft preview require a separate published snapshot; this schema currently stores live sections only.</span></div>
    <section className="admin-card admin-section-library"><div><span className="admin-kicker">ADD SECTION</span><h2>Section library</h2><p>Only registered homepage section types are available.</p></div><form action={addHomeSection}><label>Add a section<select name="type">{sectionRegistry.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}</select></label><button type="submit">Add section</button></form></section>
    <div className="admin-page-editor-list">{page.sections.map((section) => <article key={section.id} className="admin-section-editor"><div className="admin-section-overview"><div><span className="admin-drag-handle" aria-hidden="true">≡</span><strong>{prettify(section.type)}</strong><small>Type: {section.type} · Order {section.order + 1} · {section.enabled ? "Visible" : "Hidden"}</small></div><HomeSectionActions id={section.id} label={prettify(section.type)} deletable={!protectedHomepageSectionTypes.has(section.type)} move={moveHomeSection} duplicate={duplicateHomeSection} remove={deleteHomeSection} /></div><HomeSectionEditor section={{ id: section.id, type: section.type, enabled: section.enabled, content: section.content }} media={media} {...options} action={saveHomepageBuilderSection} /></article>)}</div>
  </section>;
}
