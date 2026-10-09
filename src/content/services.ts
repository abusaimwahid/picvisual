export type Service = {
  id?: string;
  slug?: string;
  featured?: boolean;
  hero?: import("./work").PublicAsset;
  seoTitle?: string | null;
  seoDescription?: string | null;
  title: string;
  shortTitle: string;
  description: string;
  items: string[];
  index: string;
};

export const services: Service[] = [
  {
    index: "01",
    title: "Image post-production",
    shortTitle: "Image post",
    description: "Careful visual finishing for product, fashion and campaign photography that needs to feel considered everywhere it appears.",
    items: ["E-commerce product editing", "High-end retouching", "Fashion & beauty", "Jewelry & product finishing", "Apparel & ghost mannequin", "Color consistency"],
  },
  {
    index: "02",
    title: "Motion post-production",
    shortTitle: "Motion post",
    description: "Rhythm, colour and polish for product stories, social motion and commercial edits made to travel across modern channels.",
    items: ["Product video editing", "Fashion & beauty reels", "Commercial edits", "Color finishing", "Social advertising", "Platform deliverables"],
  },
  {
    index: "03",
    title: "Product & jewelry finishing",
    shortTitle: "Product & jewelry",
    description: "Precise cleanup, controlled reflections and consistent surfaces for products and jewelry that must withstand close inspection.",
    items: ["Jewelry retouching", "Product cleanup", "Metal & gemstone detail", "Shadow construction", "Surface consistency", "Campaign finishing"],
  },
  {
    index: "04",
    title: "Creative production",
    shortTitle: "Creative & CGI",
    description: "Compositing, product manipulation and campaign adaptations for briefs that need a controlled, coherent visual finish.",
    items: ["Creative compositing", "Product manipulation", "Campaign adaptations", "AI-assisted production", "CGI finishing", "Format adaptation"],
  },
];
