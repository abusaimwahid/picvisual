import { z } from "zod";
import { validateSvg } from "./validation";
export { validateSvg } from "./validation";

export const brandAssetKinds = ["mainLogo", "compactLogo", "favicon", "socialLogo"] as const;
export type BrandAssetKind = (typeof brandAssetKinds)[number];

const configs = {
  mainLogo: { label: "Main logo", maxSize: 2 * 1024 * 1024, types: ["image/svg+xml", "image/png", "image/webp"], extensions: ["svg", "png", "webp"] },
  compactLogo: { label: "Compact logo", maxSize: 1 * 1024 * 1024, types: ["image/svg+xml", "image/png", "image/webp"], extensions: ["svg", "png", "webp"] },
  favicon: { label: "Favicon", maxSize: 512 * 1024, types: ["image/svg+xml", "image/png", "image/x-icon", "image/vnd.microsoft.icon"], extensions: ["svg", "png", "ico"] },
  socialLogo: { label: "Social logo", maxSize: 3 * 1024 * 1024, types: ["image/png", "image/webp"], extensions: ["png", "webp"] },
} as const;

export const brandAssetKindSchema = z.enum(brandAssetKinds);
export const getBrandAssetConfig = (kind: BrandAssetKind) => configs[kind];

function extension(filename: string) { return filename.split(".").pop()?.toLowerCase() ?? ""; }
function hasPngSignature(bytes: Uint8Array) { return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte); }
function hasWebpSignature(bytes: Uint8Array) { return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"; }
function hasIcoSignature(bytes: Uint8Array) { return bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0; }

export function validateBrandAsset(kind: BrandAssetKind, file: { name: string; type: string; size: number; bytes: Uint8Array }) {
  const config = configs[kind]; const ext = extension(file.name);
  if (!config.extensions.includes(ext as never) || !config.types.includes(file.type as never)) throw new Error(`${config.label} must be ${config.extensions.map((value) => `.${value}`).join(", ")}.`);
  const expected = ({ png: "image/png", webp: "image/webp", svg: "image/svg+xml", ico: file.type === "image/vnd.microsoft.icon" ? file.type : "image/x-icon" } as Record<string, string>)[ext];
  if (file.type !== expected) throw new Error("The file extension does not match its MIME type.");
  if (file.size <= 0 || file.size > config.maxSize) throw new Error(`${config.label} exceeds the ${Math.round(config.maxSize / 1024)} KB limit.`);
  if (ext === "png" && !hasPngSignature(file.bytes)) throw new Error("The PNG file signature is invalid.");
  if (ext === "webp" && !hasWebpSignature(file.bytes)) throw new Error("The WebP file signature is invalid.");
  if (ext === "ico" && !hasIcoSignature(file.bytes)) throw new Error("The ICO file signature is invalid.");
  if (ext === "svg") validateSvg(new TextDecoder().decode(file.bytes));
  return { extension: ext, mimeType: file.type, config };
}
