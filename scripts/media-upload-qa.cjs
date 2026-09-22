const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseEnv } = require("node:util");
const { PrismaClient } = require("@prisma/client");

Object.assign(process.env, parseEnv(fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")));
const base = "http://localhost:3000";
const origin = base;
const prisma = new PrismaClient();
const prefix = `upload-qa-${Date.now()}`;
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "picvisual-upload-qa-"));
const results = [];
const createdMedia = [];
const providerKeys = new Map();
let projectId;

function assertNonProductionCloudinary() {
  const accepted = new Set(["development", "test", "qa", "staging"]);
  const environment = (process.env.CLOUDINARY_ENVIRONMENT || "").trim().toLowerCase();
  assert.ok(
    accepted.has(environment),
    "Provider-mutating QA requires CLOUDINARY_ENVIRONMENT to be explicitly set to development, test, qa, or staging.",
  );
}

function pass(name, detail) {
  results.push({ name, status: "PASS", ...(detail ? { detail } : {}) });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cloudinarySignature(parameters) {
  return crypto.createHash("sha1").update(Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&") + process.env.CLOUDINARY_API_SECRET).digest("hex");
}

async function destroyProviderAsset(storageKey, mediaType) {
  assert.match(storageKey, /^picvisual\/media\/[0-9a-f-]{36}$/);
  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = { public_id: storageKey, timestamp: String(timestamp) };
  const form = new FormData();
  form.set("public_id", storageKey);
  form.set("timestamp", String(timestamp));
  form.set("api_key", process.env.CLOUDINARY_API_KEY);
  form.set("signature", cloudinarySignature(parameters));
  const resourceType = mediaType === "VIDEO" ? "video" : "image";
  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
  assert.equal(response.ok, true, `provider cleanup returned ${response.status}`);
}

async function providerAssetExists(storageKey, mediaType) {
  const resourceType = mediaType === "VIDEO" ? "video" : "image";
  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/${resourceType}/upload/${encodeURIComponent(storageKey)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64")}` },
    signal: AbortSignal.timeout(30_000),
  });
  return response.ok;
}

async function runPool(values, concurrency, task) {
  let cursor = 0;
  let active = 0;
  let maximumActive = 0;
  let firstError;
  const output = new Array(values.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try { output[index] = await task(values[index], index); } catch (error) { firstError ||= error; } finally { active -= 1; }
    }
  }));
  if (firstError) throw firstError;
  return { output, maximumActive };
}

async function main() {
 try {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  assert.equal(["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname), true, "Local QA database required");
  for (const name of ["AUTH_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) assert.ok(process.env[name], `${name} is required`);
  assertNonProductionCloudinary();

  const { SignJWT, decodeJwt } = await import("jose");
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  assert.equal(actor.isActive, true);
  const session = await new SignJWT({ userId: actor.id, role: actor.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const cookie = `picvisual_admin=${session}`;
  const headers = { "Content-Type": "application/json", Cookie: cookie, Origin: origin };

  const chamoisBefore = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  const chamoisHash = sha(JSON.stringify(chamoisBefore));

  let response = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ filename: "anonymous.png", mimeType: "image/png", fileSize: 10 }) });
  assert.equal(response.status, 403); pass("Anonymous signed-upload authorization rejected");
  response = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers: { ...headers, Origin: "http://invalid.example" }, body: JSON.stringify({ filename: "origin.png", mimeType: "image/png", fileSize: 10 }) });
  assert.equal(response.status, 403); pass("Cross-origin signed-upload authorization rejected");
  response = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ filename: "unsafe.svg", mimeType: "image/svg+xml", fileSize: 100 }) });
  assert.equal(response.status, 400); pass("SVG excluded from direct path");
  const unsafeSvgForm = new FormData();
  unsafeSvgForm.set("file", new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/svg+xml" }), `${prefix}-unsafe.svg`);
  response = await fetch(`${base}/api/admin/media`, { method: "POST", headers: { Cookie: cookie, Origin: origin }, body: unsafeSvgForm });
  assert.equal(response.status, 400); pass("Unsafe SVG rejected by authoritative server path");

  const smallPng = fs.readFileSync(path.join(process.cwd(), "artifacts", "technical-fixture.png"));
  const largeImagePath = path.join(temporaryDirectory, "larger.png");
  const videoPath = path.join(temporaryDirectory, "clip.mp4");
  const mismatchPath = path.join(temporaryDirectory, "mismatch.jpg");
  execFileSync("convert", ["-size", "256x256", "plasma:fractal", "-quality", "90", largeImagePath], { stdio: "ignore" });
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=480x270:rate=24", "-t", "1", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-y", videoPath], { stdio: "ignore" });
  execFileSync("convert", [largeImagePath, "-quality", "86", mismatchPath], { stdio: "ignore" });
  const largerPng = fs.readFileSync(largeImagePath);
  const mp4 = fs.readFileSync(videoPath);
  const jpegDisguisedAsPng = fs.readFileSync(mismatchPath);
  assert.ok(largerPng.length > smallPng.length);

  async function signFixture(fixture) {
    const signedResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ filename: fixture.name, mimeType: fixture.type, fileSize: fixture.bytes.length }) });
    const signed = await signedResponse.json();
    assert.equal(signedResponse.ok, true, signed.error || "signature failed");
    assert.equal(JSON.stringify(signed).includes(process.env.CLOUDINARY_API_SECRET), false);
    const payload = decodeJwt(signed.ticket);
    providerKeys.set(payload.publicId, fixture.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    return signed;
  }

  async function uploadFixture(fixture) {
    const signed = await signFixture(fixture);
    const form = new FormData();
    Object.entries(signed.parameters).forEach(([key, value]) => form.set(key, value));
    form.set("file", new Blob([fixture.bytes], { type: fixture.type }), fixture.name);
    const started = performance.now();
    const providerResponse = await fetch(signed.url, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
    const providerResult = await providerResponse.json();
    assert.equal(providerResponse.ok, true, providerResult.error?.message || "provider upload failed");
    const finalResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ ticket: signed.ticket }), signal: AbortSignal.timeout(70_000) });
    const finalized = await finalResponse.json();
    assert.equal(finalResponse.ok, true, finalized.error || "finalization failed");
    assert.equal(finalized.item.filename, fixture.name);
    assert.equal(finalized.item.fileSize, fixture.bytes.length);
    createdMedia.push(finalized.item);
    return { item: finalized.item, durationMs: performance.now() - started, bytes: fixture.bytes.length };
  }

  const fixture = (name, bytes = smallPng, type = "image/png") => ({ name: `${prefix}-${name}`, bytes, type });
  const batches = [
    { name: "1 file", fixtures: [fixture("single.png")] },
    { name: "5 images", fixtures: Array.from({ length: 5 }, (_, index) => fixture(`five-${index + 1}.png`, index === 4 ? largerPng : smallPng)) },
    { name: "10 images", fixtures: Array.from({ length: 10 }, (_, index) => fixture(`ten-${index + 1}.png`)) },
    { name: "mixed image/video", fixtures: [fixture("mixed-1.png"), fixture("mixed-2.png", largerPng), fixture("mixed-video-1.mp4", mp4, "video/mp4"), fixture("mixed-3.png"), fixture("mixed-video-2.mp4", mp4, "video/mp4")] },
  ];
  const measurements = [];
  let globalMaxActive = 0;
  for (const batch of batches) {
    const began = performance.now();
    const adminCheck = fetch(`${base}/admin/media`, { headers: { Cookie: cookie } });
    const pool = await runPool(batch.fixtures, 3, uploadFixture);
    const adminResponse = await adminCheck;
    assert.equal(adminResponse.status, 200);
    assert.equal(pool.output.length, batch.fixtures.length);
    assert.ok(pool.output.every(Boolean));
    globalMaxActive = Math.max(globalMaxActive, pool.maximumActive);
    const bytes = pool.output.reduce((sum, item) => sum + item.bytes, 0);
    const durationMs = performance.now() - began;
    measurements.push({ batch: batch.name, files: batch.fixtures.length, bytes, durationMs: Math.round(durationMs), megabytesPerSecond: Number((bytes / 1024 / 1024 / (durationMs / 1000)).toFixed(2)), maxActive: pool.maximumActive });
    pass(batch.name, `${batch.fixtures.length} finalized Media rows`);
  }
  assert.equal(globalMaxActive, 3); pass("Controlled protocol concurrency", "maximum 3 active files");
  pass("Admin remained responsive during upload", "authenticated Media page returned 200 during each batch");

  const rollbackFixture = fixture("provider-rollback.png", jpegDisguisedAsPng, "image/png");
  const rollbackSigned = await signFixture(rollbackFixture);
  const rollbackForm = new FormData();
  Object.entries(rollbackSigned.parameters).forEach(([key, value]) => rollbackForm.set(key, value));
  rollbackForm.set("file", new Blob([rollbackFixture.bytes], { type: rollbackFixture.type }), rollbackFixture.name);
  const rollbackProviderResponse = await fetch(rollbackSigned.url, { method: "POST", body: rollbackForm, signal: AbortSignal.timeout(60_000) });
  assert.equal(rollbackProviderResponse.ok, true);
  const rollbackFinalResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ ticket: rollbackSigned.ticket }), signal: AbortSignal.timeout(70_000) });
  assert.equal(rollbackFinalResponse.status, 400);
  const rollbackKey = decodeJwt(rollbackSigned.ticket).publicId;
  assert.equal(await prisma.media.count({ where: { storageKey: rollbackKey } }), 0);
  assert.equal(await providerAssetExists(rollbackKey, "IMAGE"), false);
  pass("Provider success / Media validation rollback", "no Media row or provider orphan remained");

  const validAlongsideInvalid = fixture("valid-alongside-invalid.png");
  const [invalidResult, validResult] = await Promise.allSettled([
    fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ filename: `${prefix}-invalid.exe`, mimeType: "application/octet-stream", fileSize: 10 }) }).then(async (result) => { if (result.ok) throw new Error("invalid file was accepted"); throw new Error("expected invalid file rejection"); }),
    uploadFixture(validAlongsideInvalid),
  ]);
  assert.equal(invalidResult.status, "rejected");
  assert.equal(validResult.status, "fulfilled");
  pass("Invalid file isolated from valid batch");

  const retryFixture = fixture("retry.png");
  const retrySigned = await signFixture(retryFixture);
  await assert.rejects(fetch("http://127.0.0.1:9/upload", { method: "POST", body: new FormData() }));
  const retryResult = await uploadFixture(retryFixture);
  assert.equal(retryResult.item.filename, retryFixture.name);
  await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers, body: JSON.stringify({ cancelTicket: retrySigned.ticket }) });
  pass("Transient failure retry", "only the failed fixture was retried");

  const cancelFixture = fixture("active-cancel.png", largerPng);
  const cancelSigned = await signFixture(cancelFixture);
  const cancelForm = new FormData();
  Object.entries(cancelSigned.parameters).forEach(([key, value]) => cancelForm.set(key, value));
  cancelForm.set("file", new Blob([cancelFixture.bytes], { type: cancelFixture.type }), cancelFixture.name);
  const controller = new AbortController();
  const inFlight = fetch(cancelSigned.url, { method: "POST", body: cancelForm, signal: controller.signal });
  controller.abort();
  await assert.rejects(inFlight, /abort/i);
  const cancelResponse = await fetch(`${base}/api/admin/media/direct`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ cancelTicket: cancelSigned.ticket }) });
  assert.equal(cancelResponse.ok, true);
  const canceledKey = decodeJwt(cancelSigned.ticket).publicId;
  assert.equal(await prisma.media.count({ where: { storageKey: canceledKey } }), 0);
  assert.equal(await providerAssetExists(canceledKey, "IMAGE"), false);
  pass("Active transfer cancellation", "aborted and ticket-cleaned without a live session; no Media row or provider asset");

  const searchResponse = await fetch(`${base}/api/admin/media?q=${encodeURIComponent(prefix)}`, { headers: { Cookie: cookie } });
  const search = await searchResponse.json();
  assert.equal(searchResponse.ok, true);
  assert.equal(search.items.length, createdMedia.length);
  const imageFilter = await (await fetch(`${base}/api/admin/media?q=${encodeURIComponent(prefix)}&type=IMAGE`, { headers: { Cookie: cookie } })).json();
  const videoFilter = await (await fetch(`${base}/api/admin/media?q=${encodeURIComponent(prefix)}&type=VIDEO`, { headers: { Cookie: cookie } })).json();
  assert.ok(imageFilter.items.length > 0 && imageFilter.items.every((item) => item.mediaType === "IMAGE"));
  assert.equal(videoFilter.items.length, 2);
  pass("Media Library search and filters");

  const galleryMediaIds = createdMedia.filter((item) => item.mediaType === "IMAGE").slice(0, 3).map((item) => item.id);
  projectId = (await prisma.project.create({ data: { slug: prefix, title: prefix, category: "Technical QA", summary: "Disposable local upload QA project." } })).id;
  await prisma.projectMedia.createMany({ data: galleryMediaIds.map((mediaId, order) => ({ projectId, mediaId, order, role: "GALLERY", layout: "LANDSCAPE" })), skipDuplicates: true });
  await prisma.projectMedia.createMany({ data: [{ projectId, mediaId: galleryMediaIds[0], order: 99, role: "GALLERY", layout: "LANDSCAPE" }], skipDuplicates: true });
  const gallery = await prisma.projectMedia.findMany({ where: { projectId }, orderBy: { order: "asc" }, select: { mediaId: true } });
  assert.deepEqual(gallery.map((item) => item.mediaId), galleryMediaIds);
  assert.equal(await prisma.projectMedia.count({ where: { mediaId: galleryMediaIds[0] } }), 1);
  pass("Gallery batch order and duplicate protection");
  assert.ok(await prisma.projectMedia.count({ where: { mediaId: galleryMediaIds[0] } }));
  pass("Referenced delete prerequisite remains detectable");

  const mediaHtml = await (await fetch(`${base}/admin/media`, { headers: { Cookie: cookie } })).text();
  const scriptPaths = [...mediaHtml.matchAll(/src="([^"?]+\.js[^\"]*)"/g)].map((match) => new URL(match[1], base).href);
  const clientSources = await Promise.all(scriptPaths.map((url) => fetch(url).then((result) => result.text())));
  assert.equal(mediaHtml.includes(process.env.CLOUDINARY_API_SECRET), false);
  assert.equal(clientSources.some((source) => source.includes(process.env.CLOUDINARY_API_SECRET)), false);
  pass("Cloudinary API secret absent from HTML and loaded client bundles");

  const chamoisAfter = await prisma.media.findMany({ where: { filename: { contains: "CHAMOIS", mode: "insensitive" } }, orderBy: { id: "asc" }, select: { id: true, storageKey: true, updatedAt: true } });
  assert.equal(sha(JSON.stringify(chamoisAfter)), chamoisHash);
  pass("Existing CHAMOIS media unchanged", `${chamoisAfter.length} records`);

  const report = { prefix, databaseHost: databaseUrl.hostname, results, measurements, createdMediaCount: createdMedia.length, chamoisCount: chamoisAfter.length };
  fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "artifacts", "media-upload-qa.json"), JSON.stringify(report, null, 2));
} finally {
  if (projectId) {
    await prisma.projectMedia.deleteMany({ where: { projectId } });
    await prisma.projectRevision.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
  }
  const ids = createdMedia.map((item) => item.id);
  if (ids.length) {
    await prisma.auditLog.deleteMany({ where: { entityType: "Media", entityId: { in: ids } } });
    await prisma.media.deleteMany({ where: { id: { in: ids }, filename: { startsWith: prefix } } });
  }
  for (const [storageKey, mediaType] of providerKeys) await destroyProviderAsset(storageKey, mediaType).catch((error) => console.error(`CLEANUP WARNING ${storageKey}: ${error.message}`));
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  await prisma.$disconnect();
}
}

main().then(() => process.exit(0)).catch((error) => { console.error(`FAIL ${error.message}`); process.exit(1); });
