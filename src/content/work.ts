export type Project = {
  slug: string;
  title: string;
  category: string;
  scope: string;
  summary: string;
  tone: "sky" | "azure" | "mist" | "navy";
  size: "wide" | "portrait" | "square";
  services: string[];
  gallery?: Array<{ publicUrl: string; mediaType: "IMAGE" | "VIDEO"; alt: string | null; caption: string | null }>;
  thumbnail?: { publicUrl: string; alt: string | null; focalX: number | null; focalY: number | null };
};

// Replace these art-directed placeholder entries with verified PicVisual project media.
export const projects: Project[] = [
  { slug: "form-and-finish", title: "Form / Finish", category: "Product", scope: "Image post-production", summary: "A compositional study in finish, form and controlled contrast.", tone: "sky", size: "wide", services: ["Product finishing", "Colour work", "Compositing"] },
  { slug: "skin-in-motion", title: "Skin in Motion", category: "Beauty", scope: "Motion post-production", summary: "Beauty visual language, refined for a moving frame.", tone: "azure", size: "portrait", services: ["Retouching", "Motion editing", "Colour finishing"] },
  { slug: "everyday-objects", title: "Everyday Objects", category: "E-commerce", scope: "Image post-production", summary: "Clear, repeatable product imagery with a campaign sensibility.", tone: "mist", size: "square", services: ["E-commerce editing", "Brand consistency"] },
  { slug: "lightwork", title: "Lightwork", category: "Fashion", scope: "Creative production", summary: "Layered fashion imagery with a graphic, high-contrast finish.", tone: "navy", size: "wide", services: ["Fashion retouching", "Creative compositing"] },
];

export const getProject = (slug: string) => projects.find((project) => project.slug === slug);
