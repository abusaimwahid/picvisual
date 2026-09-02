export type Service = {
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
    items: ["E-commerce product editing", "High-end retouching", "Fashion & beauty", "Jewelry & product finishing", "Apparel & ghost mannequin", "Colour consistency"],
  },
  {
    index: "02",
    title: "Motion post-production",
    shortTitle: "Motion post",
    description: "Rhythm, colour and polish for product stories, social motion and commercial edits made to travel across modern channels.",
    items: ["Product video editing", "Fashion & beauty reels", "Commercial edits", "Colour finishing", "Social advertising", "Platform deliverables"],
  },
  {
    index: "03",
    title: "Creative production",
    shortTitle: "Creative production",
    description: "An elevated finishing layer for the visual moments that call for more than a standard post-production workflow.",
    items: ["Creative compositing", "Product manipulation", "Campaign adaptations", "AI-assisted production"],
  },
];
