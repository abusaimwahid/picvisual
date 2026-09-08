import { z } from "zod";
export function isSafeHref(value: string): boolean {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try { const decoded = decodeURIComponent(value); return !decoded.startsWith("//") && !/[\u0000-\u001f\\]/.test(decoded); } catch { return false; }
  }
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export const safeHrefSchema = z.string().trim().max(500).refine(isSafeHref, "Use an internal path or an HTTPS URL.");
export const httpsUrlSchema = z.string().trim().url().refine((value) => value.startsWith("https://") && isSafeHref(value), "Use an HTTPS URL.");
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
export const navigationInput = z.object({ id: z.string().cuid().optional(), label: z.string().trim().min(1).max(60), href: safeHrefSchema, kind: z.enum(["HEADER", "FOOTER"]).default("HEADER"), enabled: z.enum(["true", "false"]).transform((value) => value === "true"), openInNewTab: z.enum(["true", "false"]).default("false").transform((value) => value === "true") });
export const settingInput = z.object({ siteName: z.string().trim().min(2).max(100), contactEmail: z.string().trim().email().max(200), description: z.string().trim().min(10).max(320), siteUrl: httpsUrlSchema.default("https://picvisual.com"), ctaLabel: z.string().trim().min(1).max(80).default("Start a Project"), ctaHref: safeHrefSchema.default("/contact"), footerText: optionalText(500), phone: optionalText(80), location: optionalText(160), seoTitle: optionalText(160), copyright: optionalText(200), socialLinks: z.string().max(3000).optional().default("").refine((text) => text.split("\n").filter(Boolean).every((line) => { const [label, url, extra] = line.split("|").map((part) => part.trim()); return !!label && !!url && !extra && httpsUrlSchema.safeParse(url).success; }), "Enter one Label | https://URL per line."), ogImageId: z.string().cuid().or(z.literal("")).optional().default("") });
export const contactInput = z.object({ name: z.string().trim().min(2, "Please enter your name.").max(120), email: z.string().trim().email("Please enter a valid email address.").max(200), company: optionalText(160), projectType: optionalText(120), estimatedVolume: optionalText(160), timeline: optionalText(160), message: z.string().trim().min(10, "Please share a few details about your project.").max(4000), projectLink: httpsUrlSchema.or(z.literal("")).optional().default(""), website: optionalText(500), startedAt: z.coerce.number().positive(), requestId: z.string().uuid() });
