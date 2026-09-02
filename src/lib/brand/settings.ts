import { unstable_cache } from "next/cache";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export type BrandAsset = { url: string; width?: number; height?: number; mimeType?: string };
export type PublicBrandSettings = { mainLogo?: BrandAsset; compactLogo?: BrandAsset; favicon?: BrandAsset; socialLogo?: BrandAsset };

const keys = { mainLogo: "brand.mainLogo", compactLogo: "brand.compactLogo", favicon: "brand.favicon", socialLogo: "brand.socialLogo" } as const;
const settingKeyToAsset = Object.fromEntries(Object.entries(keys).map(([asset, key]) => [key, asset])) as Record<string, keyof PublicBrandSettings>;

async function readBrandSettings(): Promise<PublicBrandSettings> {
  if (!hasDatabaseUrl()) return {};
  try {
    const settings = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(keys) } }, include: { logoMedia: true } });
    return settings.reduce<PublicBrandSettings>((result, setting) => {
      const assetKey = settingKeyToAsset[setting.key]; const media = setting.logoMedia;
      if (assetKey && media?.publicUrl) result[assetKey] = { url: media.publicUrl, width: media.width ?? undefined, height: media.height ?? undefined, mimeType: media.mimeType };
      return result;
    }, {});
  } catch { return {}; }
}

export const getPublicBrandSettings = unstable_cache(readBrandSettings, ["public-brand-settings"], { tags: ["brand-settings"] });
export const brandSettingKeys = keys;
