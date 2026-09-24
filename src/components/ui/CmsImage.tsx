import Image, { type StaticImageData } from "next/image";
import type { PublicAsset } from "@/content/work";
import { isRenderableImageAsset, isStaticImageSource, safeFocalPoint, safeImageDimension } from "@/lib/media/image-source";

type CmsImageProps = {
  asset?: PublicAsset | StaticImageData | null;
  alt?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

export function CmsImage({ asset, alt, priority = false, className, sizes = "(max-width: 768px) 100vw, 80vw" }: CmsImageProps) {
  if (!isRenderableImageAsset(asset)) return null;
  // Keep every supported source on Next's default loader so Fast Refresh sees one stable component shape.
  if (isStaticImageSource(asset)) {
    return <Image src={asset} alt={alt ?? ""} sizes={sizes} quality={90} priority={priority} className={className} />;
  }
  return <Image
    src={asset.publicUrl.trim()}
    alt={alt ?? asset.alt ?? ""}
    width={safeImageDimension(asset.width, 1600)}
    height={safeImageDimension(asset.height, 2000)}
    sizes={sizes}
    quality={90}
    priority={priority}
    className={className}
    style={{ objectPosition: `${safeFocalPoint(asset.focalX)}% ${safeFocalPoint(asset.focalY)}%` }}
  />;
}
