export const aboutSectionTypes = ["hero", "who", "afterShoot", "approach", "collaboration", "capabilities", "studioMedia", "workflow", "cta"] as const;
export type AboutSectionType = typeof aboutSectionTypes[number];

export type AboutContent = {
  hero: { eyebrow: string; headline: string; body: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; imageMediaId?: string; videoMediaId?: string; posterMediaId?: string };
  who: { eyebrow: string; heading: string; body: string; mediaId?: string };
  afterShoot: { eyebrow: string; heading: string; body: string; mediaId?: string };
  approach: { eyebrow: string; heading: string; body: string; principles: string[] };
  collaboration: { eyebrow: string; heading: string; body: string; audiences: string[] };
  capabilities: { eyebrow: string; heading: string; body: string; serviceIds: string[] };
  studioMedia: { eyebrow: string; heading: string; body: string; mediaId?: string; motionMediaId?: string; posterMediaId?: string };
  workflow: { eyebrow: string; heading: string; body: string; steps: string[] };
  cta: { eyebrow: string; heading: string; body: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string };
};

export const defaultAboutContent: AboutContent = {
  hero: { eyebrow: "PICVISUAL STUDIO", headline: "The production partner\nafter the shoot.", body: "PicVisual works with brands, photographers, studios and creative teams to turn raw visual assets into polished, consistent content ready for commerce, campaigns and publishing.", primaryLabel: "View Our Work", primaryHref: "/work", secondaryLabel: "Start a Project", secondaryHref: "/contact" },
  who: { eyebrow: "01 — WHO WE ARE", heading: "A visual partner for the work between capture and market.", body: "PicVisual is an image and video post-production partner supporting visual teams across product, fashion, beauty, jewelry, e-commerce and commercial content.\n\nOur role begins after capture — refining imagery, maintaining visual consistency and preparing content for its final destination." },
  afterShoot: { eyebrow: "02 — AFTER THE SHOOT", heading: "Raw assets become a coherent visual system.", body: "We bring stills, motion and campaign assets into alignment—refining colour, texture, detail and delivery so the work is ready for the places it needs to perform." },
  approach: { eyebrow: "03 — PRODUCTION APPROACH", heading: "Craft at every scale.", body: "Every brief is handled with the same balance of precise finishing and practical production thinking.", principles: ["Visual accuracy", "Texture preservation", "Color consistency", "Product fidelity", "Commercial readiness", "Scalable production", "Human quality control"] },
  collaboration: { eyebrow: "04 — COLLABORATION", heading: "Built to join the team you already have.", body: "PicVisual can work as a focused finishing partner or an extension of an established production workflow.", audiences: ["Brands", "E-commerce teams", "Photographers", "Studios", "Creative agencies", "Content production teams"] },
  capabilities: { eyebrow: "05 — CAPABILITIES", heading: "One partner across the finish.", body: "High-end retouching, product and e-commerce finishing, creative compositing and motion post-production—shaped to the visual standard of each brief.", serviceIds: [] },
  studioMedia: { eyebrow: "06 — STUDIO", heading: "A closer view of the work.", body: "A place for the textures, frames and motion details that define the finish." },
  workflow: { eyebrow: "07 — WORKFLOW", heading: "Clear from handoff to delivery.", body: "A straightforward production rhythm keeps feedback visible and the final assets organized.", steps: ["Receive", "Review", "Refine", "Quality control", "Deliver"] },
  cta: { eyebrow: "START A CONVERSATION", heading: "Have content in production?", body: "Let’s make it ready for market.", primaryLabel: "Start a Project", primaryHref: "/contact", secondaryLabel: "View Selected Work", secondaryHref: "/work" },
};
