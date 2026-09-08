import { z } from "zod";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"] as const;
const videoMimeTypes = ["video/mp4", "video/webm"] as const;
const supportedMimeTypes = [...imageMimeTypes, ...videoMimeTypes] as const;

export const mediaMetadataSchema = z.object({ filename: z.string().min(1).max(255), originalFilename: z.string().min(1).max(255), mimeType: z.enum(supportedMimeTypes), fileSize: z.number().positive().max(MAX_FILE_SIZE), focalX: z.number().int().min(0).max(100).optional(), focalY: z.number().int().min(0).max(100).optional() });
export type SupportedMediaType = "IMAGE" | "VIDEO";
export const supportedMediaAccept = supportedMimeTypes.join(",");

const extensionToMime: Record<string, (typeof supportedMimeTypes)[number]> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm" };
const text = (bytes: Uint8Array, start = 0, end?: number) => new TextDecoder().decode(bytes.slice(start, end));
const matches = (bytes: Uint8Array, expected: number[]) => bytes.length >= expected.length && expected.every((value, index) => bytes[index] === value);
const extension = (filename: string) => filename.split(".").pop()?.toLowerCase() ?? "";

export function validateSvg(svg: string) {
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg\s*>/i.test(svg)) throw new Error("The SVG file is not valid.");
  // Accept static local vector artwork; reject active XML, CSS, animation and external references.
  if (/<\s*(?:script|foreignObject|iframe|object|embed|audio|video|style|animate\w*|set|a)\b/i.test(svg) || /<!DOCTYPE|<!ENTITY|<\?(?!xml\s)|\bon\w+\s*=|\bxml:base\s*=|@import|expression\s*\(/i.test(svg)) throw new Error("The SVG contains unsafe active content.");
  for (const match of svg.matchAll(/(?:href|xlink:href)\s*=\s*(["'])(.*?)\1/gi)) if (!/^#[a-zA-Z_][\w:.-]*$/.test(match[2])) throw new Error("The SVG contains unsafe references.");
  for (const match of svg.matchAll(/url\s*\((.*?)\)/gi)) if (!/^["']?#[a-zA-Z_][\w:.-]*["']?$/.test(match[1].trim())) throw new Error("The SVG contains unsafe URLs.");
  if (/&#|\\|\b(?:href|xlink:href)\s*=\s*[^"'\s]/i.test(svg)) throw new Error("The SVG contains unsafe encoded content.");
}

function hasExpectedSignature(mimeType: (typeof supportedMimeTypes)[number], bytes: Uint8Array) {
  if (mimeType === "image/jpeg") return matches(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return matches(bytes, [137, 80, 78, 71, 13, 10, 26, 10]);
  if (mimeType === "image/webp") return text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 12) === "WEBP";
  if (mimeType === "image/avif") return text(bytes, 4, 8) === "ftyp" && /avif|avis/.test(text(bytes, 8, 24));
  if (mimeType === "image/svg+xml") { validateSvg(text(bytes)); return true; }
  if (mimeType === "video/mp4") return text(bytes, 4, 8) === "ftyp";
  if (mimeType === "video/webm") return matches(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  return false;
}

export function validateMediaFile(file: { name: string; type: string; size: number; bytes: Uint8Array }) {
  const ext = extension(file.name); const expectedMime = extensionToMime[ext];
  if (!expectedMime || !supportedMimeTypes.includes(file.type as (typeof supportedMimeTypes)[number]) || expectedMime !== file.type) throw new Error("Unsupported file type.");
  if (file.size <= 0) throw new Error("Choose a non-empty file.");
  if (file.size > MAX_FILE_SIZE) throw new Error("The file exceeds the 200 MB media limit.");
  if (!hasExpectedSignature(expectedMime, file.bytes)) throw new Error("The file signature does not match its declared type.");
  const metadata = mediaMetadataSchema.parse({ filename: file.name, originalFilename: file.name, mimeType: expectedMime, fileSize: file.size });
  return { ...metadata, mediaType: expectedMime.startsWith("video/") ? "VIDEO" as const : "IMAGE" as const };
}

export function normalizeFocalPoint(value: unknown) { const numeric = typeof value === "number" ? value : Number(value); if (!Number.isFinite(numeric)) throw new Error("Invalid focal point."); return Math.round(Math.max(0, Math.min(100, numeric))); }
