export type PublicAsset = { publicUrl: string; alt: string | null; focalX?: number | null; focalY?: number | null; width?: number | null; height?: number | null };
export type Project = {
  id?: string;
  slug: string;
  description?: string | null;
  clientName?: string | null;
  year?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featured?: boolean;
  featuredOrder?: number | null;
  hero?: PublicAsset;
  before?: PublicAsset;
  after?: PublicAsset;
  video?: PublicAsset;
  poster?: PublicAsset;
  ogImage?: PublicAsset;
  title: string;
  category: string;
  scope: string;
  summary: string;
  tone: "sky" | "azure" | "mist" | "navy";
  size: "wide" | "portrait" | "square";
  services: string[];
  gallery?: Array<{ publicUrl: string; mediaType: "IMAGE" | "VIDEO"; alt: string | null; caption: string | null; focalX?: number | null; focalY?: number | null; role?: string }>;
  thumbnail?: PublicAsset;
};

// Portfolio entries are supplied only by approved, published CMS records.
export const projects: Project[] = [];
export const getProject = (slug: string) => projects.find((project) => project.slug === slug);
