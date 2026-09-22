import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, Project, ProjectMedia } from "@prisma/client";
import { createProjectRevision, makeProjectRevisionSnapshot, projectDraftValues, projectRevisionMediaIds, projectRevisionMediaRequirements, readProjectRevisionSnapshot, restoredWorkspaceStatus } from "../src/cms/project-revisions";
import { publishedProject, snapshotJson } from "../src/cms/catalog-publication";

const project = {
  id: "project-1", publishedSlug: "case-one", publishedSnapshot: null, slug: "case-one", title: "Case One", category: "Apparel", summary: "A factual visual selection.", description: "Overview", status: "PUBLISHED", featured: true, featuredOrder: 2, isCaseStudy: true, caseStudyOrder: 1, eyebrow: "APPAREL", intro: "Introduction", challenge: null, approach: null, productionNotes: "Notes", outcome: null, year: null, clientName: null, services: ["Image post-production"], heroMediaId: "hero", thumbnailMediaId: "thumb", beforeMediaId: null, afterMediaId: null, videoMediaId: null, videoPosterMediaId: null, ogImageId: "og", seoTitle: "Case One — PicVisual", seoDescription: "Case study description", createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"), publishedAt: new Date("2026-01-01T00:00:00Z"),
  media: [{ id: "link-1", projectId: "project-1", mediaId: "gallery", order: 0, role: "DETAIL", layout: "MACRO", caption: "Detail", alt: "Garment detail" }],
} satisfies Project & { media: ProjectMedia[] };

test("Project revision snapshots cover public copy, SEO, flags, media references and gallery metadata", () => {
  const snapshot = makeProjectRevisionSnapshot(project, "DRAFT");
  assert.equal(snapshot.status, "DRAFT");
  assert.equal(snapshot.title, "Case One");
  assert.equal(snapshot.caseStudyOrder, 1);
  assert.deepEqual(snapshot.media, [{ mediaId: "gallery", order: 0, role: "DETAIL", layout: "MACRO", caption: "Detail", alt: "Garment detail" }]);
  assert.deepEqual(projectRevisionMediaIds(snapshot).sort(), ["gallery", "hero", "og", "thumb"]);
  assert.deepEqual(projectRevisionMediaRequirements(snapshot).find((item) => item.id === "hero"), { id: "hero", type: "IMAGE" });
  assert.deepEqual(readProjectRevisionSnapshot(snapshot), snapshot);
});

test("Revision snapshots are detached values and prior snapshots remain unchanged", () => {
  const snapshot = makeProjectRevisionSnapshot(project, "DRAFT");
  project.services.push("Temporary edit");
  project.media[0].caption = "Changed later";
  assert.deepEqual(snapshot.services, ["Image post-production"]);
  assert.equal(snapshot.media[0].caption, "Detail");
  project.services.pop(); project.media[0].caption = "Detail";
});

test("Legacy published gallery entries receive a safe layout default", () => {
  const legacy = {
    ...project,
    media: [{ id: "legacy-link", projectId: project.id, mediaId: "legacy-media", order: 0, role: "GALLERY", caption: null, alt: null }],
  } as unknown as Project & { media: ProjectMedia[] };
  const snapshot = makeProjectRevisionSnapshot(legacy, "PUBLISHED");
  assert.equal(snapshot.media[0].layout, "LANDSCAPE");
  assert.deepEqual(readProjectRevisionSnapshot(snapshot), snapshot);
});

test("Revision creation records actor, action, state, and a database timestamp contract", async () => {
  let payload: Record<string, unknown> | undefined;
  const tx = {
    project: { findUniqueOrThrow: async () => project },
    projectRevision: { create: async ({ data }: { data: Record<string, unknown> }) => { payload = data; return { id: "revision-1", createdAt: new Date(), ...data }; } },
  } as unknown as Prisma.TransactionClient;
  const result = await createProjectRevision(tx, project.id, "actor-1", "PUBLISH", "PUBLISHED");
  assert.equal(payload?.authorId, "actor-1");
  assert.equal(payload?.action, "PUBLISH");
  assert.equal(payload?.publicationState, "PUBLISHED");
  assert.ok(result.createdAt instanceof Date);
});

test("Restore produces draft values without publishing state and preserves a frozen public version", () => {
  const published = makeProjectRevisionSnapshot(project, "PUBLISHED");
  const historical = { ...published, title: "Historical title", status: "DRAFT" as const };
  const current = { ...project, title: "Current private title", publishedSnapshot: snapshotJson(published) } as Project;
  const restored = { ...current, ...projectDraftValues(historical), status: restoredWorkspaceStatus(current.status) } as Project;
  assert.equal(restored.title, "Historical title");
  assert.equal(restored.status, "PUBLISHED");
  assert.equal(publishedProject(restored)?.title, "Case One");
  const republished = { ...restored, publishedSnapshot: snapshotJson({ ...historical, status: "PUBLISHED" }) } as Project;
  assert.equal(publishedProject(republished)?.title, "Historical title");
  assert.equal(restoredWorkspaceStatus("ARCHIVED"), "DRAFT");
});
