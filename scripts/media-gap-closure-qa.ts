import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";
import { assertNonProductionCloudinary } from "../src/lib/media/cloudinary-qa-environment";

Object.assign(process.env, parseEnv(fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")));
const prisma = new PrismaClient();
const base = "http://localhost:3000";
const prefix = `media-gap-qa-${Date.now()}`;
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "picvisual-media-gap-"));
const providerAssets = new Map<string, "IMAGE" | "VIDEO">();
const actualMediaIds: string[] = [];
const syntheticMediaIds: string[] = [];
const tagIds: string[] = [];
const collectionIds: string[] = [];
const projectIds: string[] = [];
const results: Array<{ name: string; detail?: string }> = [];

function pass(name: string, detail?: string) { results.push({ name, ...(detail ? { detail } : {}) }); console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`); }
function sha(bytes: Uint8Array) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function snapshotHash(value: unknown) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function pageText(html: string) { return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/\s+/g, " "); }

async function main() {
 try {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname), "Local QA database required");
  for (const key of ["AUTH_SECRET", "ADMIN_EMAIL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) assert.ok(process.env[key], `${key} is required`);
  if (process.env.PICVISUAL_MEDIA_LOCAL_ONLY !== "1") assertNonProductionCloudinary();
  const [{ SignJWT }, { filterGalleryBatch }] = await Promise.all([import("jose"), import("../src/cms/gallery-batch")]);
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  const token = await new SignJWT({ userId: actor.id, role: actor.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const cookie = `picvisual_admin=${token}`;
  const headers = { Cookie: cookie, Origin: base };
  const chamoisBefore = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  const chamoisHash = snapshotHash(chamoisBefore);

  const tagFixtures = [
    { suffix: "landscape", mediaType: "IMAGE" as const, mimeType: "image/png", width: 1600, height: 900, aspectClass: "LANDSCAPE" },
    { suffix: "portrait", mediaType: "IMAGE" as const, mimeType: "image/png", width: 900, height: 1600, aspectClass: "PORTRAIT" },
    { suffix: "square", mediaType: "IMAGE" as const, mimeType: "image/png", width: 1000, height: 960, aspectClass: "SQUARE" },
    { suffix: "unknown", mediaType: "IMAGE" as const, mimeType: "image/png", width: null, height: null, aspectClass: null },
    { suffix: "video-landscape", mediaType: "VIDEO" as const, mimeType: "video/mp4", width: 1920, height: 1080, aspectClass: "LANDSCAPE" },
  ];
  for (const fixture of tagFixtures) {
    const item = await prisma.media.create({ data: { filename: `${prefix}-tag-${fixture.suffix}`, originalFilename: `${prefix}-tag-${fixture.suffix}`, storageProvider: "local-technical-fixture", storageKey: `technical/${prefix}/${fixture.suffix}`, publicUrl: `https://example.invalid/${prefix}/${fixture.suffix}`, mediaType: fixture.mediaType, mimeType: fixture.mimeType, width: fixture.width, height: fixture.height, aspectClass: fixture.aspectClass, fileSize: 1000 } });
    syntheticMediaIds.push(item.id);
  }

  let tag = await prisma.mediaTag.create({ data: { name: `${prefix} Initial` } }); tagIds.push(tag.id);
  tag = await prisma.mediaTag.update({ where: { id: tag.id }, data: { name: `${prefix} Jewelry` } });
  const secondaryTag = await prisma.mediaTag.create({ data: { name: `${prefix} Portfolio` } }); tagIds.push(secondaryTag.id);
  assert.equal(tag.name, `${prefix} Jewelry`); pass("Tag create and rename");
  const firstAssignments = await prisma.mediaTagAssignment.createMany({ data: syntheticMediaIds.map((mediaId) => ({ tagId: tag.id, mediaId })), skipDuplicates: true });
  const duplicateAssignments = await prisma.mediaTagAssignment.createMany({ data: syntheticMediaIds.map((mediaId) => ({ tagId: tag.id, mediaId })), skipDuplicates: true });
  assert.equal(firstAssignments.count, 5); assert.equal(duplicateAssignments.count, 0);
  await prisma.mediaTagAssignment.createMany({ data: syntheticMediaIds.slice(0, 2).map((mediaId) => ({ tagId: secondaryTag.id, mediaId })), skipDuplicates: true });
  pass("Single/bulk tag assignment and duplicate protection", "5 added; repeated assignment added 0");

  const collection = await prisma.mediaCollection.create({ data: { name: `${prefix} Collection` } }); collectionIds.push(collection.id);
  await prisma.mediaCollectionItem.createMany({ data: syntheticMediaIds.map((mediaId) => ({ collectionId: collection.id, mediaId })), skipDuplicates: true });
  const project = await prisma.project.create({ data: { slug: `${prefix}-used`, title: `${prefix} Used`, category: "Technical QA", summary: "Disposable combined filter fixture.", heroMediaId: syntheticMediaIds[0] } }); projectIds.push(project.id);

  let response = await fetch(`${base}/admin/media?collection=${collection.id}&tag=${tag.id}&type=IMAGE&usage=USED&aspect=LANDSCAPE&q=${encodeURIComponent(`${prefix}-tag-landscape`)}&sort=newest&size=24`, { headers: { Cookie: cookie } });
  let html = await response.text(); let visible = pageText(html);
  assert.equal(response.status, 200); assert.ok(visible.includes("Media library · 1") && html.includes(`${prefix}-tag-landscape`));
  pass("Combined collection, tag, type, used, aspect, search and sort filter");
  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix} Jewelry`)}`, { headers: { Cookie: cookie } });
  html = await response.text(); visible = pageText(html); assert.ok(visible.includes("Media library · 5"));
  pass("Search by tag");

  for (const [aspect, expected] of [["LANDSCAPE", 2], ["PORTRAIT", 1], ["SQUARE", 1]] as const) {
    response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix}-tag-`)}&aspect=${aspect}`, { headers: { Cookie: cookie } });
    visible = pageText(await response.text()); assert.ok(visible.includes(`Media library · ${expected}`), `${aspect} count mismatch`);
  }
  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix}-tag-`)}&type=VIDEO&aspect=LANDSCAPE`, { headers: { Cookie: cookie } });
  visible = pageText(await response.text()); assert.ok(visible.includes("Media library · 1"));
  response = await fetch(`${base}/admin/media?q=${encodeURIComponent(`${prefix}-tag-unknown`)}&aspect=SQUARE`, { headers: { Cookie: cookie } });
  visible = pageText(await response.text()); assert.ok(visible.includes("No media matches these filters"));
  pass("Landscape, portrait, square, video and unknown-dimension aspect safety");

  await prisma.mediaTagAssignment.deleteMany({ where: { tagId: tag.id, mediaId: { in: syntheticMediaIds.slice(0, 2) } } });
  assert.equal(await prisma.media.count({ where: { id: { in: syntheticMediaIds } } }), 5);
  assert.equal(await prisma.mediaTagAssignment.count({ where: { tagId: tag.id } }), 3);
  await prisma.mediaTag.delete({ where: { id: secondaryTag.id } }); tagIds.splice(tagIds.indexOf(secondaryTag.id), 1);
  assert.equal(await prisma.media.count({ where: { id: { in: syntheticMediaIds } } }), 5);
  pass("Remove tag and delete-tag safety", "all 5 Media records preserved");

  if (process.env.PICVISUAL_MEDIA_LOCAL_ONLY === "1") {
    const chamoisAfter = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
    assert.equal(snapshotHash(chamoisAfter), chamoisHash);
    pass("CHAMOIS safety", `${chamoisAfter.length} records unchanged`);
    fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "artifacts", "media-gap-local-qa.json"), JSON.stringify({ prefix, databaseHost: databaseUrl.hostname, chamoisCount: chamoisAfter.length, results }, null, 2));
    return;
  }

  async function uploadServerFile(filePath: string, filename: string, allowDuplicate = false) {
    const bytes = fs.readFileSync(filePath); const form = new FormData(); form.set("file", new Blob([bytes], { type: "image/jpeg" }), filename); if (allowDuplicate) form.set("duplicateChoice", "UPLOAD_ANYWAY");
    const uploadResponse = await fetch(`${base}/api/admin/media`, { method: "POST", headers, body: form, signal: AbortSignal.timeout(70_000) });
    const payload = await uploadResponse.json() as { item?: { id: string }; duplicate?: { id: string; filename: string }; error?: string };
    if (uploadResponse.status === 201 && payload.item) {
      const item = await prisma.media.findUniqueOrThrow({ where: { id: payload.item.id }, select: { id: true, filename: true, storageKey: true, mediaType: true, contentHash: true } });
      actualMediaIds.push(item.id); providerAssets.set(item.storageKey, item.mediaType); return { response: uploadResponse, payload, item };
    }
    return { response: uploadResponse, payload, item: null };
  }

  const aPath = path.join(temporaryDirectory, "a.jpg"), bPath = path.join(temporaryDirectory, "b.jpg");
  execFileSync("convert", ["-size", "128x96", "xc:#6a1739", "-quality", "88", aPath]);
  execFileSync("convert", ["-size", "128x96", "xc:#176a39", "-quality", "88", bPath]);
  const a = await uploadServerFile(aPath, `${prefix}-A.jpg`); assert.equal(a.response.status, 201); assert.match(a.item!.contentHash!, /^[a-f0-9]{64}$/);
  const renamedCopy = await uploadServerFile(aPath, `${prefix}-copy-of-A.jpg`); assert.equal(renamedCopy.response.status, 409); assert.equal(renamedCopy.payload.duplicate?.id, a.item!.id);
  assert.equal(await prisma.media.count({ where: { contentHash: a.item!.contentHash } }), 1);
  pass("Different filename, same content duplicate detection", "rejected before provider upload");

  response = await fetch(`${base}/api/admin/media/duplicate`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ contentHash: a.item!.contentHash }) });
  const lookup = await response.json() as { duplicate?: { id: string } };
  assert.equal(lookup.duplicate?.id, a.item!.id);
  assert.equal(await prisma.media.count({ where: { contentHash: a.item!.contentHash } }), 1);
  pass("Use Existing", "existing Media id returned with no second row or binary upload");
  const allowedCopy = await uploadServerFile(aPath, `${prefix}-copy-of-A.jpg`, true); assert.equal(allowedCopy.response.status, 201); assert.notEqual(allowedCopy.item!.id, a.item!.id); assert.equal(allowedCopy.item!.contentHash, a.item!.contentHash);
  assert.equal(await prisma.media.count({ where: { contentHash: a.item!.contentHash } }), 2);
  pass("Upload Anyway", "second provider asset and Media row created explicitly");

  const sameNameA = await uploadServerFile(aPath, `${prefix}-IMG_0001.jpg`, true); const sameNameB = await uploadServerFile(bPath, `${prefix}-IMG_0001.jpg`);
  assert.equal(sameNameA.response.status, 201); assert.equal(sameNameB.response.status, 201); assert.notEqual(sameNameA.item!.contentHash, sameNameB.item!.contentHash);
  pass("Same filename, different content safety");

  const duplicateGalleryProject = await prisma.project.create({ data: { slug: `${prefix}-duplicate-gallery`, title: `${prefix} Duplicate Gallery`, category: "Technical QA", summary: "Disposable duplicate gallery fixture." } }); projectIds.push(duplicateGalleryProject.id);
  const galleryBatch = filterGalleryBatch([a.item!.id, a.item!.id], []);
  await prisma.projectMedia.createMany({ data: galleryBatch.added.map((mediaId, order) => ({ projectId: duplicateGalleryProject.id, mediaId, order, role: "GALLERY", layout: "LANDSCAPE" })), skipDuplicates: true });
  assert.equal(galleryBatch.added.length, 1); assert.equal(galleryBatch.duplicateCount, 1);
  pass("Use Existing gallery interaction", "existing Media added once; repeated relation skipped");

  async function directUpload(filePath: string, filename: string, mimeType: "image/jpeg" | "video/mp4" = "image/jpeg", includeClientHash = true) {
    const bytes = fs.readFileSync(filePath), contentHash = includeClientHash ? sha(bytes) : undefined;
    const signResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ filename, mimeType, fileSize: bytes.length, ...(contentHash ? { contentHash } : {}) }) });
    const signed = await signResponse.json() as { url: string; parameters: Record<string, string>; ticket: string; error?: string }; assert.equal(signResponse.ok, true, signed.error);
    if (signed.parameters.public_id) providerAssets.set(signed.parameters.public_id, mimeType.startsWith("video/") ? "VIDEO" : "IMAGE");
    const form = new FormData(); Object.entries(signed.parameters).forEach(([key, value]) => form.set(key, value)); form.set("file", new Blob([bytes], { type: mimeType }), filename);
    const providerResponse = await fetch(signed.url, { method: "POST", body: form, signal: AbortSignal.timeout(70_000) }); assert.equal(providerResponse.ok, true);
    const finalResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ ticket: signed.ticket }), signal: AbortSignal.timeout(includeClientHash ? 70_000 : 5 * 60_000) });
    const finalized = await finalResponse.json() as { item?: { id: string }; error?: string }; assert.equal(finalResponse.ok, true, finalized.error);
    const item = await prisma.media.findUniqueOrThrow({ where: { id: finalized.item!.id }, select: { id: true, storageKey: true, mediaType: true, contentHash: true } });
    actualMediaIds.push(item.id); providerAssets.set(item.storageKey, item.mediaType); if (contentHash) assert.equal(item.contentHash, contentHash); else assert.match(item.contentHash ?? "", /^[a-f0-9]{64}$/); return item;
  }
  const batchPaths: string[] = [];
  for (let index = 0; index < 10; index += 1) { const filePath = path.join(temporaryDirectory, `batch-${index}.jpg`); execFileSync("convert", ["-size", "256x192", `xc:rgb(${20 + index * 15},${40 + index * 7},${100 + index * 9})`, "-quality", "86", filePath]); batchPaths.push(filePath); }
  const began = performance.now(); let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => { while (cursor < batchPaths.length) { const index = cursor++; await directUpload(batchPaths[index], `${prefix}-batch-${index}.jpg`); } }));
  const batchMs = Math.round(performance.now() - began);
  pass("10-image hash/direct-upload performance", `${batchMs}ms total at concurrency 3`);

  const largeVideoPath = path.join(temporaryDirectory, "large-video.mp4");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30", "-t", "12", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "8", "-pix_fmt", "yuv420p", "-y", largeVideoPath]);
  const largeBytes = fs.statSync(largeVideoPath).size; assert.ok(largeBytes > 32 * 1024 * 1024);
  const largeStarted = performance.now(); await directUpload(largeVideoPath, `${prefix}-large-video.mp4`, "video/mp4", false); const largeMs = Math.round(performance.now() - largeStarted);
  pass("Large-file post-provider streaming hash", `${(largeBytes / 1024 / 1024).toFixed(1)} MB finalized in ${largeMs}ms without a client hash`);

  const chamoisAfter = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  assert.equal(snapshotHash(chamoisAfter), chamoisHash); pass("CHAMOIS safety", `${chamoisAfter.length} records unchanged`);
  fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "artifacts", "media-gap-closure-qa.json"), JSON.stringify({ prefix, databaseHost: databaseUrl.hostname, batchMs, largeFile: { bytes: largeBytes, durationMs: largeMs }, results }, null, 2));
 } finally {
  for (const projectId of projectIds) { await prisma.projectMedia.deleteMany({ where: { projectId } }); await prisma.projectRevision.deleteMany({ where: { projectId } }); await prisma.project.deleteMany({ where: { id: projectId } }); }
  if (collectionIds.length) await prisma.mediaCollection.deleteMany({ where: { id: { in: collectionIds } } });
  if (tagIds.length) await prisma.mediaTag.deleteMany({ where: { id: { in: tagIds } } });
  for (const [storageKey, mediaType] of providerAssets) { try { const { getMediaProvider } = await import("../src/lib/media/provider"); await getMediaProvider().delete(storageKey, mediaType); } catch (error) { console.error(`CLEANUP WARNING ${storageKey}: ${error instanceof Error ? error.message : String(error)}`); } }
  if (actualMediaIds.length) { await prisma.auditLog.deleteMany({ where: { entityType: "Media", entityId: { in: actualMediaIds } } }); await prisma.media.deleteMany({ where: { id: { in: actualMediaIds } } }); }
  if (syntheticMediaIds.length) await prisma.media.deleteMany({ where: { id: { in: syntheticMediaIds } } });
  await prisma.mediaTag.deleteMany({ where: { name: { startsWith: prefix } } }); await prisma.mediaCollection.deleteMany({ where: { name: { startsWith: prefix } } });
  fs.rmSync(temporaryDirectory, { recursive: true, force: true }); await prisma.$disconnect();
 }
}

main().catch((error) => { console.error(`FAIL ${error instanceof Error ? error.stack : String(error)}`); process.exitCode = 1; });
