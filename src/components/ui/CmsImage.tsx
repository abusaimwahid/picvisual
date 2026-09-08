import Image from "next/image";
import type { PublicAsset } from "@/content/work";

export function CmsImage({ asset, alt, priority = false, className, sizes = "(max-width: 768px) 100vw, 80vw" }: { asset: PublicAsset; alt?: string; priority?: boolean; className?: string; sizes?: string }) {
  return <Image src={asset.publicUrl} alt={alt ?? asset.alt ?? ""} width={asset.width || 1600} height={asset.height || 2000} sizes={sizes} quality={90} priority={priority} className={className} style={{ objectPosition: `${asset.focalX ?? 50}% ${asset.focalY ?? 50}%` }} />;
}
