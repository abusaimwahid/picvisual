import type { StaticImageData } from "next/image";
import type { PublicAsset } from "@/content/work";

export type SupportedImageSource = string | StaticImageData;
export type ImageSourceKind = "local" | "cloudinary" | "static" | "invalid";

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isStaticImageSource(source: unknown): source is StaticImageData {
  if (!source || typeof source !== "object") return false;
  const value = source as Partial<StaticImageData>;
  return typeof value.src === "string"
    && value.src.startsWith("/")
    && !value.src.startsWith("//")
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height);
}

export function classifyImageSource(source: unknown): ImageSourceKind {
  if (isStaticImageSource(source)) return "static";
  if (typeof source !== "string") return "invalid";
  const value = source.trim();
  if (!value || value.startsWith("//")) return "invalid";
  if (value.startsWith("/")) return "local";
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "res.cloudinary.com"
      && /^\/[^/]+\/image\/upload\//.test(url.pathname)
      ? "cloudinary"
      : "invalid";
  } catch {
    return "invalid";
  }
}

export function isRenderableVideoSource(source: unknown) {
  if (typeof source !== "string") return false;
  const value = source.trim();
  if (!value || value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "res.cloudinary.com"
      && /^\/[^/]+\/video\/upload\//.test(url.pathname);
  } catch {
    return false;
  }
}

export function isRenderableImageAsset(asset: PublicAsset | StaticImageData | null | undefined): asset is PublicAsset | StaticImageData {
  if (!asset) return false;
  if (isStaticImageSource(asset)) return true;
  return typeof asset === "object" && classifyImageSource((asset as PublicAsset).publicUrl) !== "invalid";
}

export function safeImageDimension(value: unknown, fallback: number) {
  return isPositiveFiniteNumber(value) ? value : fallback;
}

export function safeFocalPoint(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
}
