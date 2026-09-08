import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { validateMediaFile } from "./validation";
import { getMediaProvider } from "./provider";
export const uploadRequest = z.object({ filename: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml", "video/mp4", "video/webm"]), fileSize: z.number().int().positive().max(200 * 1024 * 1024) });
function credentials() { const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET; if (!cloud || !key || !secret || !process.env.AUTH_SECRET) throw new Error("Media storage is not configured."); return { cloud, key, secret }; }
export async function signDirectUpload(actorId: string, raw: unknown) {
  const data = uploadRequest.parse(raw); const { cloud, key, secret } = credentials();
  if (data.mimeType === "image/svg+xml" && data.fileSize > 2 * 1024 * 1024) throw new Error("SVG files must be 2 MB or smaller.");
  const timestamp = Math.floor(Date.now() / 1000), publicId = `picvisual/media/${randomUUID()}`;
  const resourceType = data.mimeType.startsWith("video/") ? "video" : "image";
  const allowed_formats = resourceType === "video" ? "mp4,webm" : "jpg,png,webp,avif,svg";
  const parameters = { allowed_formats, overwrite: "false", public_id: publicId, timestamp: String(timestamp) };
  const signature = createHash("sha1").update(Object.entries(parameters).map(([key, value]) => `${key}=${value}`).join("&") + secret).digest("hex");
  const ticket = await new SignJWT({ ...data, actorId, publicId, resourceType }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return { url: `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, parameters: { ...parameters, signature, api_key: key }, ticket };
}
export async function finishDirectUpload(actorId: string, ticket: string) {
  const { cloud, key, secret } = credentials(); const { payload } = await jwtVerify(ticket, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ["HS256"] });
  if (payload.actorId !== actorId || typeof payload.publicId !== "string" || !payload.publicId.startsWith("picvisual/media/")) throw new Error("Invalid upload ticket.");
  const metadata = uploadRequest.parse(payload); const resourceType = payload.resourceType === "video" ? "video" : "image";
  const existing = await prisma.media.findUnique({ where: { storageKey: payload.publicId } }); if (existing) return existing;
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${resourceType}/upload/${encodeURIComponent(payload.publicId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Could not verify the uploaded file.");
  const asset = await response.json() as { secure_url: string; public_id: string; bytes: number; width?: number; height?: number; duration?: number; format: string };
  const expected = new URL(asset.secure_url);
  if (expected.hostname !== "res.cloudinary.com" || expected.protocol !== "https:" || asset.public_id !== payload.publicId) throw new Error("Invalid storage response.");
  try {
    if (asset.bytes !== metadata.fileSize || asset.bytes > 200 * 1024 * 1024) throw new Error("Uploaded file size does not match.");
    const remote = await fetch(asset.secure_url, { headers: { Range: `bytes=0-${metadata.mimeType === "image/svg+xml" ? 2 * 1024 * 1024 : 65535}` }, cache: "no-store" });
    if (!remote.ok || !remote.body) throw new Error("Could not validate the file.");
    const reader = remote.body.getReader(); const chunks: Uint8Array[] = []; let size = 0; const limit = metadata.mimeType === "image/svg+xml" ? 2 * 1024 * 1024 : 65536;
    while (size < limit) { const { done, value } = await reader.read(); if (done) break; chunks.push(value.slice(0, limit-size)); size += value.length; }
    await reader.cancel(); const bytes = Buffer.concat(chunks);
    const validated = validateMediaFile({ name: metadata.filename, type: metadata.mimeType, size: asset.bytes, bytes });
    return await prisma.media.upsert({ where: { storageKey: asset.public_id }, update: {}, create: { filename: metadata.filename, originalFilename: metadata.filename, storageProvider: "cloudinary", storageKey: asset.public_id, publicUrl: asset.secure_url, mimeType: metadata.mimeType, mediaType: validated.mediaType, fileSize: asset.bytes, width: asset.width, height: asset.height, duration: asset.duration } });
  } catch (error) { await getMediaProvider().delete(asset.public_id, resourceType === "video" ? "VIDEO" : "IMAGE").catch(() => undefined); throw error; }
}
