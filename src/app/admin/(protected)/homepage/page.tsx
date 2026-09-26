import { addHomeSection, deleteHomeSection, duplicateHomeSection, moveHomeSection, publishHomepage, restoreHomepageRevision, saveHomepageBuilderSection } from "@/app/admin/actions";
import { EmptyState, PageHeader } from "@/components/admin/AdminPrimitives";
import { HomepageWorkspace } from "@/components/admin/HomepageWorkspace";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { sectionRegistry } from "@/cms/section-registry";
import { protectedHomepageSectionTypes } from "@/cms/homepage-editor";
import { getHomepageMoveAvailability } from "@/cms/homepage-ordering";

export default async function HomepageAdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" description="The existing public homepage stays on its verified fallback until a database is configured." /><EmptyState title="Database not configured" description="Set DATABASE_URL to use the protected homepage builder. No content migration has been run." /></section>;
  const [page, media, services, projects, faqs] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } }, revisions: { where: { note: { in: ["homepage:draft", "homepage:published"] } }, include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 12 } } }),
    prisma.media.findMany({ select: { id: true, filename: true, publicUrl: true, mediaType: true, alt: true, caption: true, width: true, height: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.service.findMany({ select: { id: true, title: true, category: true }, where: { status: "PUBLISHED" }, orderBy: { title: "asc" } }),
    prisma.project.findMany({ select: { id: true, title: true, category: true }, where: { status: "PUBLISHED" }, orderBy: { updatedAt: "desc" } }),
    prisma.fAQ.findMany({ select: { id: true, question: true }, where: { pageKey: "home", enabled: true }, orderBy: { order: "asc" } }),
  ]);
  if (!page) return <section className="admin-content"><PageHeader eyebrow="CONTENT / HOME" title="Homepage" /><EmptyState title="Homepage not seeded" description="Run the approved seed workflow after configuring the database." /></section>;
  const options = { services: services.map((service) => ({ id: service.id, label: service.title, detail: service.category })), projects: projects.map((project) => ({ id: project.id, label: project.title, detail: project.category })), faqs: faqs.map((faq) => ({ id: faq.id, label: faq.question })) };
  const latestPublished = page.revisions.find((revision) => revision.note === "homepage:published"); const latestDraft = page.revisions.find((revision) => revision.note === "homepage:draft"); const pending = Boolean(latestDraft && (!latestPublished || latestDraft.createdAt > latestPublished.createdAt));
  const params = await searchParams;
  return <HomepageWorkspace
    sections={page.sections.map((section) => ({ ...section, ...getHomepageMoveAvailability(page.sections, section.id), deletable: !protectedHomepageSectionTypes.has(section.type) }))}
    definitions={sectionRegistry.map(({ type, label, description, editor }) => ({ type, label, description, editor }))}
    media={media}
    {...options}
    revisions={page.revisions.map((revision) => ({ id: revision.id, state: revision.note === "homepage:published" ? "PUBLISHED" as const : "DRAFT" as const, createdAt: revision.createdAt.toLocaleString(), author: revision.author?.name || revision.author?.email || "System" }))}
    initialSectionId={params.section}
    pageStatus={page.status}
    publicationSummary={latestPublished ? `Last published ${latestPublished.createdAt.toLocaleString()}` : "Approved seeded baseline"}
    pending={pending}
    addSection={addHomeSection}
    saveSection={saveHomepageBuilderSection}
    moveSection={moveHomeSection}
    duplicateSection={duplicateHomeSection}
    deleteSection={deleteHomeSection}
    restoreRevision={restoreHomepageRevision}
    publish={publishHomepage}
  />;
}
