import { z } from "zod";
import { isSafeHref } from "@/lib/validation/site";

const mediaId = z.string().cuid().optional();
const copy = z.string().trim();
const cta = z.object({ label: copy.max(40), href: copy.max(200).refine(isSafeHref, "Use an internal path or HTTPS URL.") });
const immersiveSceneSchema = z.object({ label: copy.max(70), heading: copy.max(140), description: copy.max(500), primaryMediaId: mediaId, secondaryMediaId: mediaId, tertiaryMediaId: mediaId, mobileMediaId: mediaId, posterMediaId: mediaId });
const item = z.object({ title: copy.max(80), description: copy.max(300), enabled: z.boolean().default(true) });

export const sectionSchemas = {
  hero: z.object({ eyebrow: copy.max(90), headline: copy.max(120), secondaryHeadline: copy.max(120).optional(), description: copy.max(400), primaryCta: cta, secondaryCta: cta.optional(), primaryMediaId: mediaId, secondaryMediaId: mediaId, backgroundMediaId: mediaId, videoMediaId: mediaId, posterMediaId: mediaId, mobileMediaId: mediaId, motionPreset: z.enum(["subtle", "standard", "expressive"]).default("standard"), motionIntensity: z.enum(["low", "medium", "high"]).default("medium") }),
  positioning: z.object({ eyebrow: copy.max(90).optional(), headline: copy.max(160), body: copy.max(600), highlight: copy.max(160).optional(), mediaId, theme: z.enum(["LIGHT", "DARK", "BRAND"]).default("LIGHT") }),
  capabilities: z.object({ eyebrow: copy.max(90).optional(), heading: copy.max(120).optional(), description: copy.max(500).optional(), serviceIds: z.array(z.string().cuid()).max(6), items: z.array(item.extend({ mediaId })).max(6).default([]) }),
  beforeAfter: z.object({ eyebrow: copy.max(90).optional(), heading: copy.max(100), description: copy.max(500).optional(), beforeMediaId: mediaId, afterMediaId: mediaId, detailMediaId: mediaId, beforeLabel: copy.max(50).default("RAW"), afterLabel: copy.max(50).default("REFINED") }),
  selectedWork: z.object({ heading: copy.max(100), description: copy.max(500).optional(), cta: cta.optional(), projectIds: z.array(z.string().cuid()).max(8) }),
  motionShowcase: z.object({ heading: copy.max(100), mediaId }),
  productionWorkflow: z.object({ eyebrow: copy.max(90).optional(), heading: copy.max(100), description: copy.max(500).optional(), steps: z.array(item).min(2).max(6) }),
  whyPicVisual: z.object({ eyebrow: copy.max(90).optional(), heading: copy.max(100), description: copy.max(500).optional(), items: z.array(item).max(6) }),
  faq: z.object({ heading: copy.max(100), description: copy.max(500).optional(), displayMode: z.enum(["ALL_ENABLED", "SELECTED"]).default("ALL_ENABLED"), faqIds: z.array(z.string().cuid()).max(20) }),
  cta: z.object({ eyebrow: copy.max(70), heading: copy.max(120), body: copy.max(250), cta }),
  textMedia: z.object({ heading: copy.max(120), body: copy.max(1200), mediaId, preset: z.enum(["media-left", "media-right", "full-bleed", "editorial"]) }),
  gallery: z.object({ mediaIds: z.array(z.string().cuid()).min(1).max(20), preset: z.enum(["editorial-collage", "horizontal-strip", "masonry"]) }),
  video: z.object({ mediaId: z.string().cuid(), posterMediaId: mediaId }),
  richText: z.object({ heading: copy.max(120).optional(), body: copy.max(4000) }),
  imagePost: immersiveSceneSchema.extend({ rawMediaId: mediaId, finishedMediaId: mediaId, detailMediaIds: z.array(z.string().cuid()).max(3).default([]) }),
  videoEdit: immersiveSceneSchema.extend({ videoMediaId: mediaId, timelineMediaIds: z.array(z.string().cuid()).max(3).default([]), finalFrameMediaId: mediaId, mobileVideoMediaId: mediaId }),
  motion: immersiveSceneSchema.extend({ reelMediaIds: z.array(z.string().cuid()).max(3).default([]), posterMediaIds: z.array(z.string().cuid()).max(3).default([]) }),
  product: immersiveSceneSchema.extend({ sourceMediaId: mediaId, cutoutMediaId: mediaId, shadowMediaId: mediaId, finalMediaId: mediaId, campaignMediaId: mediaId }),
  jewelry: immersiveSceneSchema.extend({ primaryMediaId: mediaId, macroMediaId: mediaId, supportingMediaId: mediaId }),
  creative: immersiveSceneSchema.extend({ backgroundMediaId: mediaId, subjectMediaId: mediaId, shadowMediaId: mediaId, lightMediaId: mediaId, textureMediaId: mediaId, finalMediaId: mediaId }),
  development: immersiveSceneSchema.extend({ interfaceMediaId: mediaId, fragmentMediaId: mediaId, screenshotMediaId: mediaId, backgroundMediaId: mediaId }),
} as const;
export type SectionType = keyof typeof sectionSchemas;
export type SectionContent<T extends SectionType = SectionType> = z.infer<(typeof sectionSchemas)[T]>;
export function validateSection<T extends SectionType>(type: T, content: unknown): SectionContent<T> { return sectionSchemas[type].parse(content) as SectionContent<T>; }
