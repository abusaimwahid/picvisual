import type { PublicAsset } from "./work";

export type DemoAsset = PublicAsset & { mediaType: "IMAGE"; sampleLabel: string };

/**
 * Local, non-client presentation media. Public CMS media always takes priority.
 * Keeping these assets in one module makes the fallback simple to replace or remove.
 */
export const demoMedia = {
  hero: {
    publicUrl: "/demo/home/hero-product.jpg",
    alt: "Sample visual of an unbranded blue glass product in a cinematic studio set",
    width: 1672,
    height: 941,
    focalX: 68,
    focalY: 50,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / product finish",
  },
  beauty: {
    publicUrl: "/demo/home/fashion-beauty.jpg",
    alt: "Sample beauty retouching visual with natural skin texture and blue fabric",
    width: 1122,
    height: 1402,
    focalX: 52,
    focalY: 42,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / beauty retouching",
  },
  jewelry: {
    publicUrl: "/demo/home/jewelry-macro.jpg",
    alt: "Sample jewelry retouching visual of an unbranded silver ring",
    width: 1122,
    height: 1402,
    focalX: 52,
    focalY: 48,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / jewelry detail",
  },
  product: {
    publicUrl: "/demo/home/product-ecommerce.jpg",
    alt: "Sample e-commerce product visual of an unbranded shoe",
    width: 1536,
    height: 1024,
    focalX: 58,
    focalY: 48,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / e-commerce finish",
  },
  creative: {
    publicUrl: "/demo/home/creative-composite.jpg",
    alt: "Sample CGI composite with glass, fabric and sculptural forms",
    width: 1536,
    height: 1024,
    focalX: 54,
    focalY: 50,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / creative composite",
  },
  motion: {
    publicUrl: "/demo/home/motion-color.jpg",
    alt: "Sample motion and color-grading sequence with a dancer",
    width: 1672,
    height: 941,
    focalX: 50,
    focalY: 50,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / motion and colour",
  },
  beautyDetail: {
    publicUrl: "/demo/home/beauty-detail-study.jpg",
    alt: "Sample editorial beauty macro showing natural skin texture and controlled tonal detail",
    width: 1536,
    height: 1024,
    focalX: 69,
    focalY: 47,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / texture study",
  },
  productMaterial: {
    publicUrl: "/demo/home/product-material-study.jpg",
    alt: "Sample unbranded product material study with ceramic and blue acrylic",
    width: 1536,
    height: 1024,
    focalX: 52,
    focalY: 50,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / material finish",
  },
  creativeMaterial: {
    publicUrl: "/demo/home/creative-material-study.jpg",
    alt: "Sample creative composite of glass, brushed metal and blue fabric",
    width: 1672,
    height: 941,
    focalX: 52,
    focalY: 50,
    mediaType: "IMAGE",
    sampleLabel: "Sample visual / composite study",
  },
} satisfies Record<string, DemoAsset>;

export const demoWorlds = [
  {
    type: "imagePost",
    label: "IMAGE POST / FASHION + BEAUTY",
    heading: "Texture, tone, detail.",
    description: "A sample presentation of careful beauty finishing, tonal control and natural detail. Replace it with approved media from the Homepage editor.",
    assets: [demoMedia.beauty, demoMedia.beautyDetail, demoMedia.jewelry],
  },
  {
    type: "product",
    label: "PRODUCT / E-COMMERCE",
    heading: "Clean enough to inspect.",
    description: "Cutouts, surfaces, shadows and colour consistency composed for high-volume commerce and campaign use.",
    assets: [demoMedia.product, demoMedia.productMaterial, demoMedia.hero],
  },
  {
    type: "jewelry",
    label: "JEWELRY / MACRO",
    heading: "Precision at every scale.",
    description: "A sample macro study built around controlled metal, clean facets and the small decisions that make detail feel premium.",
    assets: [demoMedia.jewelry, demoMedia.creativeMaterial, demoMedia.productMaterial],
  },
  {
    type: "videoEdit",
    label: "VIDEO / EDIT / COLOUR",
    heading: "Every cut earns its colour.",
    description: "A finishing environment for edit, grade and delivery—assembled around one cinematic frame.",
    assets: [demoMedia.motion, demoMedia.hero, demoMedia.beautyDetail],
  },
  {
    type: "motion",
    label: "MOTION / SEQUENCE",
    heading: "A sequence you can feel.",
    description: "Frames, timing and motion detail arranged as one scroll-scrubbed visual sequence.",
    assets: [demoMedia.motion, demoMedia.creativeMaterial, demoMedia.productMaterial],
  },
  {
    type: "creative",
    label: "CREATIVE / COMPOSITING / CGI",
    heading: "Built beyond the capture.",
    description: "Layered environments, digital craft and AI-assisted production where the brief calls for a controlled composite.",
    assets: [demoMedia.creativeMaterial, demoMedia.creative, demoMedia.productMaterial],
  },
] as const;

export const demoPortfolio = [
  {
    title: "Beauty / Detail",
    category: "Image post-production",
    scope: "Sample concept",
    summary: "A demonstration of natural texture, tonal control and editorial beauty finishing.",
    asset: demoMedia.beautyDetail,
  },
  {
    title: "Product / Form",
    category: "E-commerce + product",
    scope: "Sample concept",
    summary: "A clean product study focused on surface, edge, shadow and commercial consistency.",
    asset: demoMedia.product,
  },
  {
    title: "Motion / Atmosphere",
    category: "Motion + colour",
    scope: "Sample concept",
    summary: "A cinematic sequence demonstrating motion direction, colour and campaign-ready framing.",
    asset: demoMedia.motion,
  },
] as const;

export const demoGallery = [
  demoMedia.beautyDetail,
  demoMedia.productMaterial,
  demoMedia.jewelry,
  demoMedia.motion,
  demoMedia.creativeMaterial,
  demoMedia.hero,
] as const;

export const demoServiceMedia = [demoMedia.beautyDetail, demoMedia.motion, demoMedia.creativeMaterial] as const;
