import Link from "next/link";
import { addHomeSection, deleteHomeSection, duplicateHomeSection, moveHomeSection, publishHomepage, restoreHomepageRevision, saveHomepageBuilderSection } from "@/app/admin/actions";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/AdminPrimitives";
import { HomeSectionActions } from "@/components/admin/HomeSectionActions";
import { HomepagePublishActions } from "@/components/admin/HomepagePublishActions";
import { HomeSectionEditor } from "@/components/admin/HomeSectionEditor";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { sectionRegistry } from "@/cms/section-registry";
import { protectedHomepageSectionTypes } from "@/cms/homepage-editor";
import { getHomepageMoveAvailability } from "@/cms/homepage-ordering";

const prettify = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

export default async function HomepageAdminPage() {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" description="The existing public homepage stays on its verified fallback until a database is configured." /><EmptyState title="Database not configured" description="Set DATABASE_URL to use the protected homepage builder. No content migration has been run." /></section>;
  const [page, media, services, projects, faqs] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } }, revisions: { where: { note: { in: ["homepage:draft", "homepage:published"] } }, include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 12 } } }),
    prisma.media.findMany({ select: { id: true, filename: true, publicUrl: true, mediaType: true, alt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.service.findMany({ select: { id: true, title: true, category: true }, where: { status: "PUBLISHED" }, orderBy: { title: "asc" } }),
    prisma.project.findMany({ select: { id: true, title: true, category: true }, where: { status: "PUBLISHED" }, orderBy: { updatedAt: "desc" } }),
    prisma.fAQ.findMany({ select: { id: true, question: true }, where: { pageKey: "home", enabled: true }, orderBy: { order: "asc" } }),
  ]);
  if (!page) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" /><EmptyState title="Homepage not seeded" description="Run the approved seed workflow after configuring the database." /></section>;
  const options = { services: services.map((service) => ({ id: service.id, label: service.title, detail: service.category })), projects: projects.map((project) => ({ id: project.id, label: project.title, detail: project.category })), faqs: faqs.map((faq) => ({ id: faq.id, label: faq.question })) };
  const latestPublished = page.revisions.find((revision) => revision.note === "homepage:published"); const latestDraft = page.revisions.find((revision) => revision.note === "homepage:draft"); const pending = Boolean(latestDraft && (!latestPublished || latestDraft.createdAt > latestPublished.createdAt));
  return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" description="Homepage edits save as draft. Production only changes after an explicit publish." />
    <div className="admin-home-actions"><div><Link href="/" target="_blank">View published homepage ↗</Link><span><StatusBadge value={page.status} /> {latestPublished ? `Last published ${latestPublished.createdAt.toLocaleString()}` : "Approved seeded baseline"} · {pending ? "Draft changes pending" : "No unpublished draft changes"}</span></div><HomepagePublishActions publish={publishHomepage} /></div>
    <section className="admin-card admin-section-library"><div><span className="admin-kicker">ADD SECTION</span><h2>Section library</h2><p>Only registered homepage section types are available.</p></div><form action={addHomeSection}><label>Add a section<select name="type">{sectionRegistry.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}</select></label><button type="submit">Add section</button></form></section>
    <div className="admin-page-editor-list">{page.sections.map((section) => { const moves = getHomepageMoveAvailability(page.sections, section.id); return <article key={section.id} className="admin-section-editor"><div className="admin-section-overview"><div><span className="admin-drag-handle" aria-hidden="true">≡</span><strong>{prettify(section.type)}</strong><small>Type: {section.type} · Order {section.order + 1} · {section.enabled ? "Visible in draft" : "Hidden in draft"}</small></div><HomeSectionActions id={section.id} label={prettify(section.type)} deletable={!protectedHomepageSectionTypes.has(section.type)} {...moves} move={moveHomeSection} duplicate={duplicateHomeSection} remove={deleteHomeSection} /></div><HomeSectionEditor section={{ id: section.id, type: section.type, enabled: section.enabled, content: section.content }} media={media} {...options} action={saveHomepageBuilderSection} /></article>; })}</div>
    <section className="admin-card admin-revisions"><div><span className="admin-kicker">REVISION HISTORY</span><h2>Homepage snapshots</h2><p>Restore copies a snapshot into the draft workspace. It never publishes automatically.</p></div>{page.revisions.length ? <div className="admin-revision-list">{page.revisions.map((revision) => <div key={revision.id}><span><StatusBadge value={revision.note === "homepage:published" ? "PUBLISHED" : "DRAFT"} /> {revision.createdAt.toLocaleString()} · {revision.author?.name || revision.author?.email || "System"}</span><form action={restoreHomepageRevision}><input type="hidden" name="revisionId" value={revision.id} /><button type="submit">Restore to draft</button></form></div>)}</div> : <p>No snapshot exists yet. The current approved homepage will be captured before the first draft change.</p>}</section>
  </section>;
}
