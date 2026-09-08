"use client";
import type { ImageLoaderProps } from "next/image";
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src)) return src.replace("/image/upload/", `/image/upload/f_auto,c_limit,w_${width},q_${quality || 90}/`);
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality || 90}`;
}
