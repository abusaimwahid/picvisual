import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { validateMediaFile } from "./validation";
import { getMediaProvider } from "./provider";
import { withProviderRollback } from "./rollback";
import { classifyMediaAspect } from "./management";
const PROVIDER_REQUEST_TIMEOUT_MS = 30_000;
const PROVIDER_HASH_TIMEOUT_MS = 5 * 60_000;
export const uploadRequest = z.object({ filename: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml", "video/mp4", "video/webm"]), fileSize: z.number().int().positive().max(200 * 1024 * 1024), contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional() });
function credentials() { const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET; if (!cloud || !key || !secret || !process.env.AUTH_SECRET) throw new Error("Media storage is not configured."); return { cloud, key, secret }; }
async function readUploadTicket(ticket: string, actorId?: string) {
  if (!process.env.AUTH_SECRET) throw new Error("Media storage is not configured.");
  const { payload } = await jwtVerify(ticket, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ["HS256"] });
  const metadata = uploadRequest.parse(payload);
  const publicId = payload.publicId;
  const resourceType = payload.resourceType;
  if (typeof payload.actorId !== "string" || (actorId && payload.actorId !== actorId) || typeof publicId !== "string" || !/^picvisual\/media\/[0-9a-f-]{36}$/.test(publicId) || (resourceType !== "image" && resourceType !== "video")) throw new Error("Invalid upload ticket.");
  if ((metadata.mimeType.startsWith("video/") ? "video" : "image") !== resourceType) throw new Error("Invalid upload ticket.");
  return { metadata, publicId, resourceType, actorId: payload.actorId } as const;
}
export async function signDirectUpload(actorId: string, raw: unknown) {
  const data = uploadRequest.parse(raw); const { cloud, key, secret } = credentials();
  if (data.mimeType === "image/svg+xml") throw new Error("SVG files use the secure server upload path.");
  const timestamp = Math.floor(Date.now() / 1000), publicId = `picvisual/media/${randomUUID()}`;
  const resourceType = data.mimeType.startsWith("video/") ? "video" : "image";
  const allowed_formats = resourceType === "video" ? "mp4,webm" : "jpg,png,webp,avif,svg";
  const parameters = { allowed_formats, overwrite: "false", public_id: publicId, timestamp: String(timestamp) };
  const signature = createHash("sha1").update(Object.entries(parameters).map(([key, value]) => `${key}=${value}`).join("&") + secret).digest("hex");
  const ticket = await new SignJWT({ ...data, actorId, publicId, resourceType }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("55m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return { url: `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, parameters: { ...parameters, signature, api_key: key }, ticket };
}
async function inspectRemoteAsset(publicUrl: string, expectedBytes: number, suppliedHash?: string) {
  const response = await fetch(publicUrl, { headers: suppliedHash ? { Range: "bytes=0-65535" } : {}, cache: "no-store", signal: AbortSignal.timeout(suppliedHash ? PROVIDER_REQUEST_TIMEOUT_MS : PROVIDER_HASH_TIMEOUT_MS) });
  if (!response.ok || !response.body) throw new Error("Could not validate the file.");
  const reader = response.body.getReader();
  const firstChunks: Uint8Array[] = [];
  const hasher = suppliedHash ? null : createHash("sha256");
  let firstSize = 0, total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    hasher?.update(value);
    if (firstSize < 65536) { const chunk = value.slice(0, 65536 - firstSize); firstChunks.push(chunk); firstSize += chunk.length; }
    if (!suppliedHash && total > expectedBytes) { await reader.cancel(); throw new Error("Uploaded file size does not match."); }
    if (suppliedHash && firstSize >= 65536) { await reader.cancel(); break; }
  }
  if (!suppliedHash && total !== expectedBytes) throw new Error("Uploaded file size does not match.");
  return { inspected: Buffer.concat(firstChunks), contentHash: suppliedHash ?? hasher!.digest("hex") };
}

export async function finishDirectUpload(actorId: string, ticket: string, allowDuplicate = false) {
  const { cloud, key, secret } = credentials();
  const { metadata, publicId, resourceType } = await readUploadTicket(ticket, actorId);
  const existing = await prisma.media.findUnique({ where: { storageKey: publicId } }); if (existing) return { kind: "media" as const, item: existing };
  return withProviderRollback(async () => {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` }, cache: "no-store", signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error("Could not verify the uploaded file.");
    const asset = await response.json() as { secure_url: string; public_id: string; resource_type?: string; bytes: number; width?: number; height?: number; duration?: number; format: string };
    const expected = new URL(asset.secure_url);
    if (expected.hostname !== "res.cloudinary.com" || expected.protocol !== "https:" || asset.public_id !== publicId || (asset.resource_type && asset.resource_type !== resourceType)) throw new Error("Invalid storage response.");
    if (asset.bytes !== metadata.fileSize || asset.bytes > 200 * 1024 * 1024) throw new Error("Uploaded file size does not match.");
    const inspection = await inspectRemoteAsset(asset.secure_url, asset.bytes, metadata.contentHash);
    const validated = validateMediaFile({ name: metadata.filename, type: metadata.mimeType, size: asset.bytes, bytes: inspection.inspected });
    const duplicate = await prisma.media.findFirst({ where: { contentHash: inspection.contentHash }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } });
    if (duplicate && !allowDuplicate) return { kind: "duplicate" as const, existingId: duplicate.id };
    const item = await prisma.media.upsert({ where: { storageKey: asset.public_id }, update: {}, create: { filename: metadata.filename, originalFilename: metadata.filename, storageProvider: "cloudinary", storageKey: asset.public_id, publicUrl: asset.secure_url, mimeType: metadata.mimeType, mediaType: validated.mediaType, fileSize: asset.bytes, width: asset.width, height: asset.height, duration: asset.duration, contentHash: inspection.contentHash, aspectClass: classifyMediaAspect(asset.width, asset.height) } });
    return { kind: "media" as const, item };
  }, () => getMediaProvider().delete(publicId, resourceType === "video" ? "VIDEO" : "IMAGE"));
}

export async function reuseExistingDirectUpload(actorId: string, ticket: string, existingId: string) {
  const { publicId, resourceType } = await readUploadTicket(ticket, actorId);
  const existing = await prisma.media.findUnique({ where: { id: existingId } });
  if (!existing) throw new Error("The existing Media record is no longer available.");
  await getMediaProvider().delete(publicId, resourceType === "video" ? "VIDEO" : "IMAGE");
  return existing;
}

export async function cancelDirectUpload(actorId: string, ticket: string) {
  const { publicId, resourceType } = await readUploadTicket(ticket, actorId);
  const existing = await prisma.media.findUnique({ where: { storageKey: publicId }, select: { id: true } });
  if (existing) return false;
  await getMediaProvider().delete(publicId, resourceType === "video" ? "VIDEO" : "IMAGE");
  return true;
}
