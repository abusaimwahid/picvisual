/** Intentional, idempotent content pass. No user, project, media or history is deleted. */
import { PrismaClient, Prisma } from "@prisma/client";
import { pageCopy } from "../src/content/pages";
import { snapshotJson } from "../src/cms/catalog-publication";
import { makeHomepageSnapshot, readHomepageSnapshot, validateHomepageSnapshot } from "../src/cms/homepage-publication";
import { sectionSchemas, type SectionType } from "../src/cms/types/sections";
const db = new PrismaClient();
async function main() {
  const identity = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(identity.hostname) && process.env.APPROVED_CONTENT_PRODUCTION !== "1") throw new Error("Remote content pass requires intentional production mode.");
  const files = ["CHAMOIS_CH03_2.jpg", "CHAMOIS_CH03_3.jpg", "CHAMOIS_CH03_5.jpg", "CHAMOIS_CH03_THREADS_ECOM_9_12_240924.jpg"];
  const assets = await Promise.all(files.map((originalFilename) => db.media.findFirst({ where: { originalFilename, storageProvider: "cloudinary" } })));
  if (assets.some((asset) => !asset)) throw new Error("Approved CHAMOIS assets must be present before publishing.");
  const media = assets.map((asset) => asset!);
  const alts = ["Full-length apparel image of a red turtleneck sweater with dark wide-leg jeans", "Close detail of red knitwear, ribbed collar and pink lettering", "Side detail showing knit texture, cuff and garment drape", "Full-length styled view of red knitwear with a dark tote bag"];
  await db.$transaction(async (tx) => {
    for (const [index, asset] of media.entries()) if (!asset.alt) await tx.media.update({ where: { id: asset.id }, data: { alt: alts[index], focalX: 50, focalY: index === 1 || index === 2 ? 40 : 50 } });
    const fields = { title: "CHAMOIS", category: "Apparel", summary: "A selection of approved PicVisual imagery featuring CHAMOIS apparel.", description: "Full-length views and close details of red knitwear. This selection brings together four approved images.", services: [], featured: true, featuredOrder: 0, heroMediaId: media[3].id, thumbnailMediaId: media[0].id, ogImageId: media[3].id, seoTitle: "CHAMOIS — PicVisual", seoDescription: "Four approved PicVisual images featuring CHAMOIS apparel, from full-length views to knitwear details." };
    const project = await tx.project.upsert({ where: { slug: "apparel-color-and-texture" }, update: {}, create: { slug: "apparel-color-and-texture", ...fields, status: "PUBLISHED", publishedAt: new Date() } });
    for (const [index, asset] of media.entries()) await tx.projectMedia.upsert({ where: { projectId_mediaId: { projectId: project.id, mediaId: asset.id } }, update: {}, create: { projectId: project.id, mediaId: asset.id, order: index, role: index === 1 || index === 2 ? "DETAIL" : "GALLERY", alt: alts[index] } });
    if (!project.publishedSnapshot) { const complete = await tx.project.findUniqueOrThrow({ where: { id: project.id }, include: { media: { orderBy: { order: "asc" } } } }); await tx.project.update({ where: { id: project.id }, data: { publishedSlug: project.slug, publishedSnapshot: snapshotJson(complete) } }); }
    // Only known original demo rows with no chosen portfolio assets are archived.
    await tx.project.updateMany({ where: { slug: { in: ["form-and-finish", "skin-in-motion", "everyday-objects", "lightwork"] }, heroMediaId: null, thumbnailMediaId: null }, data: { status: "ARCHIVED", featured: false } });
    const global = await tx.siteSetting.findUnique({ where: { key: "global" } });
    const old = global?.value && typeof global.value === "object" ? global.value as Record<string, Prisma.InputJsonValue> : {};
    await tx.siteSetting.upsert({ where: { key: "global" }, update: { value: { ...old, contactEmail: old.contactEmail === "hello@picvisual.example" || !old.contactEmail ? "info@picvisual.com" : old.contactEmail } }, create: { key: "global", value: { siteName: "PicVisual", contactEmail: "info@picvisual.com", description: "Image and video post-production for brands, e-commerce and creative teams." } } });
    for (const [slug, copy] of Object.entries(pageCopy)) {
      const page = await tx.page.findUnique({ where: { slug }, include: { sections: true } });
      if (!page) continue;
      if (!page.sections.length) { await tx.page.update({ where: { id: page.id }, data: { title: copy.title } }); await tx.pageSection.create({ data: { pageId: page.id, order: 0, type: "richText", content: { body: copy.body, approachHeading: copy.approachHeading, approachBody: copy.approachBody } } }); }
    }
    const footer = await tx.navigation.upsert({ where: { kind: "FOOTER" }, create: { kind: "FOOTER", name: "Footer" }, update: {} });
    if (await tx.navigationItem.count({ where: { navigationId: footer.id } }) === 0) for (const [order, [label, href]] of [["Work", "/work"], ["Services", "/services"], ["Studio", "/about"], ["Contact", "/contact"]].entries()) await tx.navigationItem.create({ data: { navigationId: footer.id, label, href, order } });
    const home = await tx.page.findUniqueOrThrow({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } }, revisions: { where: { note: "homepage:published" }, orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!await tx.siteSetting.findUnique({ where: { key: "launch.approved-content.20260906" } })) {
      const snapshot = readHomepageSnapshot(home.revisions[0]?.snapshot) ?? makeHomepageSnapshot(home);
      const sceneCopies = [
        ["imagePost", { label: "IMAGE POST", heading: "Texture, color and the considered finish.", description: "Apparel finishing that keeps the character of the garment in view.", primaryMediaId: media[1].id, finishedMediaId: media[1].id, detailMediaIds: [media[2].id, media[0].id] }],
        ["videoEdit", { label: "VIDEO POST", heading: "Color, rhythm and the decisive cut.", description: "Editing, grading and finishing for commercial video. A view of the production process." }],
        ["motion", { label: "MOTION", heading: "Still imagery with a pulse.", description: "Timing and movement shaped around the visual brief." }],
        ["product", { label: "PRODUCT / APPAREL", heading: "Ready for the product page.", description: "A consistent finish across full-length views and garment details.", finalMediaId: media[3].id }],
        ["jewelry", { label: "JEWELRY", heading: "Light, texture and the fine detail.", description: "Careful finishing for reflective surfaces, gemstones and intricate settings." }],
        ["creative", { label: "CREATIVE", heading: "Independent layers. One finished image.", description: "Compositing and image adaptation guided by the campaign brief." }],
        ["development", { label: "INTERACTIVE", heading: "Visual assets in their next setting.", description: "Preparing images and motion for consistent use across digital channels." }],
      ] as const;
      for (const entry of snapshot.sections) {
        const content = entry.content as Record<string, unknown>;
        if (entry.type === "productionWorkflow") content.steps = (content.steps as unknown[]).map((step) => typeof step === "string" ? { title: step, description: "", enabled: true } : step);
        if (entry.type === "selectedWork") content.projectIds = [project.id];
        if (entry.type === "hero") { content.primaryMediaId = media[0].id; content.secondaryMediaId = media[1].id; }
        if (entry.type === "whyPicVisual" && !(content.items as unknown[])?.length) content.items = [{ title: "Careful visual craft", description: "Attention to tone, texture and the original capture.", enabled: true }, { title: "Consistent delivery", description: "A shared finish carried across the image set.", enabled: true }, { title: "Clear collaboration", description: "Briefs, review stages and handoffs agreed together.", enabled: true }];
        entry.content = sectionSchemas[entry.type as SectionType].parse(content);
      }
      const at = snapshot.sections.findIndex((section) => section.type === "selectedWork");
      for (const [type, content] of [...sceneCopies].reverse()) if (!snapshot.sections.some((section) => section.type === type)) snapshot.sections.splice(at, 0, { type, content: sectionSchemas[type].parse(content), order: 0, enabled: true, theme: null, settings: null });
      snapshot.sections.forEach((section, index) => { section.order = index; });
      const problem = await validateHomepageSnapshot(tx, snapshot); if (problem) throw new Error(problem);
      await tx.pageRevision.create({ data: { pageId: home.id, note: "homepage:published", snapshot: snapshot as Prisma.InputJsonValue } });
      // Keep unrelated draft copy. Insert missing scene controls and normalize existing legacy values only.
      for (const section of home.sections) await tx.pageSection.update({ where: { id: section.id }, data: { order: -10000 - section.order } });
      for (const [order, entry] of snapshot.sections.entries()) {
        const existing = home.sections.find((section) => section.type === entry.type);
        if (existing) { const content = existing.content as Record<string, unknown>; if (entry.type === "productionWorkflow") content.steps = (content.steps as unknown[]).map((step) => typeof step === "string" ? { title: step, description: "", enabled: true } : step); if (entry.type === "selectedWork") content.projectIds = [project.id]; if (entry.type === "hero") { content.primaryMediaId = media[0].id; content.secondaryMediaId = media[1].id; } await tx.pageSection.update({ where: { id: existing.id }, data: { order, content: content as Prisma.InputJsonValue } }); }
        else await tx.pageSection.create({ data: { pageId: home.id, type: entry.type, order, content: entry.content as Prisma.InputJsonValue } });
      }
      await tx.siteSetting.create({ data: { key: "launch.approved-content.20260906", value: { projectId: project.id, approvedMediaIds: media.map((asset) => asset.id), userApproval: "Approved for public portfolio use" } } });
      await tx.auditLog.create({ data: { action: "APPROVED_CONTENT_PUBLISHED", entityType: "Page", entityId: home.id, metadata: { projectId: project.id } } });
    }
  }, { timeout: 30000 });
  console.log("Approved content pass completed; original records and history preserved.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]") : "Content pass failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
