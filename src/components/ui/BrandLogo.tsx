/* eslint-disable @next/next/no-img-element -- Dynamic brand SVGs and arbitrary configured CDN hosts cannot safely use a fixed Next image loader. */
import Image from "next/image";
import logo from "../../../public/brand/picvisual-logo.png";
import type { BrandAsset } from "@/lib/brand/settings";

type BrandLogoProps = { className?: string; priority?: boolean; source?: BrandAsset };

export function BrandLogo({ className = "", priority = false, source }: BrandLogoProps) {
  if (source?.url) return <img className={`brand-logo ${className}`} src={source.url} alt="PicVisual" width={source.width ?? 4500} height={source.height ?? 4500} />;
  return <Image className={`brand-logo ${className}`} src={logo} alt="PicVisual" priority={priority} sizes="(max-width: 800px) 48px, 72px" />;
}
