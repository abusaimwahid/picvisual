import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";
import { assertNonProductionCloudinary } from "../src/lib/media/cloudinary-qa-environment";

Object.assign(process.env, parseEnv(fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")));

const prisma = new PrismaClient();
const base = "http://localhost:3000";
const prefix = `media-management-qa-${Date.now()}`;
const results: Array<{ name: string; detail?: string }> = [];
const actualMediaIds: string[] = [];
const providerAssets = new Map<string, "IMAGE" | "VIDEO">();
let collectionId: string | undefined;
let galleryProjectId: string | undefined;
let usageProjectId: string | undefined;
let usageServiceId: string | undefined;

function pass(name: string, detail?: string) {
  results.push({ name, ...(detail ? { detail } : {}) });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function snapshotHash(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function pageText(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/&times;/g, "×").replace(/\s+/g, " ");
}

async function main() {
 try {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname), "Media management QA requires a local database");
  for (const key of ["AUTH_SECRET", "ADMIN_EMAIL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) assert.ok(process.env[key], `${key} is required`);
  if (process.env.PICVISUAL_MEDIA_LOCAL_ONLY !== "1") assertNonProductionCloudinary();

  const [{ SignJWT }, { getMediaUsage, getMediaUsageBatch }, { processBulkDelete }, { getMediaProvider }, { filterGalleryBatch }] = await Promise.all([
    import("jose"), import("../src/lib/media/usage"), import("../src/lib/media/management"), import("../src/lib/media/provider"), import("../src/cms/gallery-batch"),
  ]);
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  const token = await new SignJWT({ userId: actor.id, role: actor.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const cookie = `picvisual_admin=${token}`;
  const chamoisBefore = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  const chamoisHash = snapshotHash(chamoisBefore);

  const anonymous = await fetch(`${base}/admin/media`, { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /admin\/login/);
  pass("Server authorization", `anonymous request rejected with ${anonymous.status}`);

  const fixtureRows = Array.from({ length: 500 }, (_, index) => ({
    filename: `${prefix}-${String(index).padStart(4, "0")}.${index === 0 ? "svg" : "png"}`,
    originalFilename: `${prefix}-${String(index).padStart(4, "0")}.${index === 0 ? "svg" : "png"}`,
    storageProvider: "local-technical-fixture",
    storageKey: `technical/${prefix}/${index}`,
    publicUrl: `https://example.invalid/${prefix}/${index}.${index === 0 ? "svg" : "png"}`,
    mimeType: index === 0 ? "image/svg+xml" : "image/png",
    mediaType: "IMAGE" as const,
    width: index % 3 === 0 ? 1200 : 800,
    height: index % 3 === 0 ? 800 : 1200,
    fileSize: 1000 + index,
    alt: index === 4 ? `${prefix} searchable alt` : `Technical fixture ${index}`,
    caption: index === 5 ? `${prefix} searchable caption` : null,
  }));
  await prisma.media.createMany({ data: fixtureRows });
  const fixtureMedia = await prisma.media.findMany({ where: { filename: { startsWith: prefix } }, orderBy: { filename: "asc" }, select: { id: true, filename: true } });
  assert.equal(fixtureMedia.length, 500);

  const pageStarted = performance.now();
  let response = await fetch(`${base}/admin/media?q=${encodeURIComponent(prefix)}&size=96`, { headers: { Cookie: cookie } });
  let html = await response.text();
  let visible = pageText(html);
  const pageDuration = performance.now() - pageStarted;
  assert.equal(response.status, 200);
  assert.ok(visible.includes("Media library · 500"));
  assert.ok(visible.includes("Page 1 of 6"));
  assert.equal((html.match(/class="media-card-select"/g) ?? []).length, 96);
  assert.ok(html.includes("Select all on this page") && html.includes("Selection is scoped to this page"));
  pass("500 Media usability and bounded server pagination", `96 of 500 rendered in ${Math.round(pageDuration)}ms`);

  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(prefix)}&size=96&page=6`, { headers: { Cookie: cookie } });
  html = await response.text();
  visible = pageText(html);
  assert.equal(response.status, 200);
  assert.ok(visible.includes("Page 6 of 6"));
  assert.equal((html.match(/class="media-card-select"/g) ?? []).length, 20);
  pass("Pagination URL state", "page 6 rendered only the final 20 records");

  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(prefix)}&type=SVG&size=24`, { headers: { Cookie: cookie } });
  html = await response.text();
  visible = pageText(html);
  assert.ok(visible.includes("Media library · 1") && html.includes(`${prefix}-0000.svg`));
  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix} searchable`)}&type=IMAGE&usage=UNUSED&sort=name-asc&size=24`, { headers: { Cookie: cookie } });
  html = await response.text();
  visible = pageText(html);
  assert.equal(response.status, 200);
  assert.ok(visible.includes("Media library · 2"));
  pass("Search, type, unused and sort combination");

  collectionId = (await prisma.mediaCollection.create({ data: { name: `${prefix} Collection A` } })).id;
  const collectionMediaIds = fixtureMedia.slice(1, 6).map((item) => item.id);
  await prisma.mediaCollectionItem.createMany({ data: collectionMediaIds.map((mediaId) => ({ collectionId: collectionId!, mediaId })), skipDuplicates: true });
  await prisma.mediaCollectionItem.createMany({ data: collectionMediaIds.map((mediaId) => ({ collectionId: collectionId!, mediaId })), skipDuplicates: true });
  assert.equal(await prisma.mediaCollectionItem.count({ where: { collectionId } }), 5);
  response = await fetch(`${base}/admin/media?collection=${collectionId}&q=${encodeURIComponent(prefix)}&type=IMAGE&sort=newest&size=24`, { headers: { Cookie: cookie } });
  html = await response.text();
  visible = pageText(html);
  assert.equal(response.status, 200);
  assert.ok(visible.includes("Media library · 5"));
  pass("Combined collection, type, search and sort filter", "5 memberships, no duplicates");
  await prisma.mediaCollectionItem.deleteMany({ where: { collectionId, mediaId: { in: collectionMediaIds.slice(0, 2) } } });
  assert.equal(await prisma.mediaCollectionItem.count({ where: { collectionId } }), 3);
  assert.equal(await prisma.media.count({ where: { id: { in: collectionMediaIds } } }), 5);
  await prisma.mediaCollection.delete({ where: { id: collectionId } });
  collectionId = undefined;
  assert.equal(await prisma.media.count({ where: { id: { in: collectionMediaIds } } }), 5);
  pass("Collection add, remove and delete safety", "all 5 Media records preserved");

  galleryProjectId = (await prisma.project.create({ data: { slug: `${prefix}-gallery`, title: `${prefix} gallery`, category: "Technical QA", summary: "Disposable Media management QA gallery." } })).id;
  const selectedGalleryIds = fixtureMedia.slice(8, 11).map((item) => item.id);
  const firstBatch = filterGalleryBatch(selectedGalleryIds, []);
  await prisma.projectMedia.createMany({ data: firstBatch.added.map((mediaId, order) => ({ projectId: galleryProjectId!, mediaId, order, role: "GALLERY", layout: "LANDSCAPE" })), skipDuplicates: true });
  const secondBatch = filterGalleryBatch([...selectedGalleryIds, selectedGalleryIds[0]], selectedGalleryIds);
  assert.equal(secondBatch.added.length, 0);
  assert.equal(secondBatch.duplicateCount, 4);
  const gallery = await prisma.projectMedia.findMany({ where: { projectId: galleryProjectId }, orderBy: { order: "asc" }, select: { mediaId: true } });
  assert.deepEqual(gallery.map((item) => item.mediaId), selectedGalleryIds);
  pass("Gallery batch order and duplicate protection");

  if (process.env.PICVISUAL_MEDIA_LOCAL_ONLY === "1") {
    const chamoisAfter = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
    assert.equal(snapshotHash(chamoisAfter), chamoisHash);
    pass("CHAMOIS safety", `${chamoisAfter.length} approved records unchanged`);
    fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "artifacts", "media-management-local-qa.json"), JSON.stringify({ prefix, databaseHost: databaseUrl.hostname, pageDurationMs: Math.round(pageDuration), fixtureCount: fixtureMedia.length, chamoisCount: chamoisAfter.length, results }, null, 2));
    return;
  }

  async function upload(name: string) {
    const bytes = fs.readFileSync(path.join(process.cwd(), "artifacts", "technical-fixture.png"));
    const form = new FormData();
    form.set("file", new Blob([bytes], { type: "image/png" }), `${prefix}-${name}.png`);
    const uploadResponse = await fetch(`${base}/api/admin/media`, { method: "POST", headers: { Cookie: cookie, Origin: base }, body: form, signal: AbortSignal.timeout(70_000) });
    const payload = await uploadResponse.json() as { item?: { id: string }; error?: string };
    assert.equal(uploadResponse.status, 201, payload.error);
    const item = await prisma.media.findUniqueOrThrow({ where: { id: payload.item!.id }, select: { id: true, storageKey: true, mediaType: true } });
    actualMediaIds.push(item.id); providerAssets.set(item.storageKey, item.mediaType);
    return item;
  }

  const [referenced, shared, safe] = await Promise.all([upload("referenced"), upload("shared"), upload("safe")]);
  usageProjectId = (await prisma.project.create({ data: { slug: `${prefix}-usage`, title: `${prefix} usage project`, category: "Technical QA", summary: "Disposable usage fixture.", heroMediaId: referenced.id, thumbnailMediaId: shared.id } })).id;
  usageServiceId = (await prisma.service.create({ data: { slug: `${prefix}-service`, title: `${prefix} service`, category: "Technical QA", shortDescription: "Disposable usage fixture.", thumbnailMediaId: shared.id } })).id;
  await prisma.projectMedia.create({ data: { projectId: usageProjectId, mediaId: shared.id, order: 0, role: "GALLERY", layout: "LANDSCAPE" } });
  const usage = await getMediaUsageBatch([referenced.id, shared.id, safe.id]);
  assert.ok((usage.get(referenced.id)?.referenceCount ?? 0) >= 1);
  assert.ok((usage.get(shared.id)?.referenceCount ?? 0) >= 3);
  assert.equal(usage.get(safe.id)?.referenceCount, 0);
  const verified = new Map<string, Awaited<ReturnType<typeof getMediaUsage>>>();
  const outcomes = await processBulkDelete(
    [referenced.id, shared.id, safe.id].map((id) => ({ id, filename: usage.get(id)!.media.filename, referenceCount: usage.get(id)!.referenceCount })),
    async (id) => { const current = await getMediaUsage(id); verified.set(id, current); return current?.referenceCount ?? null; },
    async (id) => {
      const current = verified.get(id);
      assert.ok(current && current.referenceCount === 0);
      await getMediaProvider().delete(current.media.storageKey, current.media.mediaType);
      await prisma.media.delete({ where: { id } });
      providerAssets.delete(current.media.storageKey);
    },
  );
  assert.deepEqual(outcomes.map((item) => item.status), ["protected", "protected", "deleted"]);
  assert.equal(await prisma.media.count({ where: { id: safe.id } }), 0);
  assert.equal(await prisma.media.count({ where: { id: { in: [referenced.id, shared.id] } } }), 2);
  pass("Mixed reference-aware bulk delete E2E", "referenced and shared protected; safe provider asset and row deleted");
  pass("Per-item delete outcomes", outcomes.map((item) => `${item.filename}:${item.status}`).join(", "));

  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix}-shared`)}&usage=USED`, { headers: { Cookie: cookie } });
  html = await response.text();
  visible = pageText(html);
  assert.equal(response.status, 200);
  assert.ok(html.includes(`${prefix}-shared.png`) && visible.includes("Used in 3 locations"));
  pass("Used filter and usage detail");

  const chamoisAfter = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  assert.equal(snapshotHash(chamoisAfter), chamoisHash);
  pass("CHAMOIS safety", `${chamoisAfter.length} approved records unchanged`);

  fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "artifacts", "media-management-qa.json"), JSON.stringify({ prefix, databaseHost: databaseUrl.hostname, pageDurationMs: Math.round(pageDuration), fixtureCount: fixtureMedia.length, chamoisCount: chamoisAfter.length, results }, null, 2));
} finally {
  if (usageProjectId) {
    await prisma.projectMedia.deleteMany({ where: { projectId: usageProjectId } });
    await prisma.projectRevision.deleteMany({ where: { projectId: usageProjectId } });
    await prisma.project.deleteMany({ where: { id: usageProjectId } });
  }
  if (usageServiceId) await prisma.service.deleteMany({ where: { id: usageServiceId } });
  if (galleryProjectId) {
    await prisma.projectMedia.deleteMany({ where: { projectId: galleryProjectId } });
    await prisma.projectRevision.deleteMany({ where: { projectId: galleryProjectId } });
    await prisma.project.deleteMany({ where: { id: galleryProjectId } });
  }
  if (collectionId) await prisma.mediaCollection.deleteMany({ where: { id: collectionId } });
  for (const [storageKey, mediaType] of providerAssets) {
    try { const { getMediaProvider } = await import("../src/lib/media/provider"); await getMediaProvider().delete(storageKey, mediaType); }
    catch (error) { console.error(`CLEANUP WARNING ${storageKey}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (actualMediaIds.length) {
    await prisma.auditLog.deleteMany({ where: { entityType: "Media", entityId: { in: actualMediaIds } } });
    await prisma.media.deleteMany({ where: { id: { in: actualMediaIds } } });
  }
  await prisma.mediaCollectionItem.deleteMany({ where: { media: { filename: { startsWith: prefix } } } });
  await prisma.media.deleteMany({ where: { filename: { startsWith: prefix } } });
  await prisma.$disconnect();
}
}

main().catch((error) => { console.error(`FAIL ${error instanceof Error ? error.stack : String(error)}`); process.exitCode = 1; });
