import type { SectionType } from "@/cms/types/sections";

export type HomepageOrderRule = { placement: "fixed" | "quiet"; fixedPosition?: "first" | "early" | "last" };
export type OrderedHomepageSection = { id: string; type: string; order: number };

// The immersive sequence relies on its current DOM adjacency. Only the quiet
// editorial block below it can safely be reordered without changing motion.
export const homepageOrderRules: Record<SectionType, HomepageOrderRule> = {
  hero: { placement: "fixed", fixedPosition: "first" }, positioning: { placement: "fixed", fixedPosition: "early" }, capabilities: { placement: "fixed", fixedPosition: "early" }, beforeAfter: { placement: "fixed", fixedPosition: "early" }, selectedWork: { placement: "fixed" }, motionShowcase: { placement: "fixed" }, productionWorkflow: { placement: "quiet" }, whyPicVisual: { placement: "quiet" }, faq: { placement: "quiet" }, cta: { placement: "fixed", fixedPosition: "last" }, textMedia: { placement: "fixed" }, gallery: { placement: "fixed" }, video: { placement: "fixed" }, richText: { placement: "fixed" }, imagePost: { placement: "fixed" }, videoEdit: { placement: "fixed" }, motion: { placement: "fixed" }, product: { placement: "fixed" }, jewelry: { placement: "fixed" }, creative: { placement: "fixed" }, development: { placement: "fixed" },
};

export const fallbackQuietSectionTypes = ["productionWorkflow", "whyPicVisual", "faq"] as const;

function ruleFor(type: string) { return homepageOrderRules[type as SectionType]; }

export function getHomepageMoveAvailability(sections: OrderedHomepageSection[], id: string) {
  const current = sections.find((section) => section.id === id);
  if (!current || ruleFor(current.type)?.placement !== "quiet") return { canMoveUp: false, canMoveDown: false };
  const group = sections.filter((section) => ruleFor(section.type)?.placement === "quiet").sort((a, b) => a.order - b.order);
  const index = group.findIndex((section) => section.id === id);
  return { canMoveUp: index > 0, canMoveDown: index >= 0 && index < group.length - 1 };
}

export function getHomepageMoveTarget(sections: OrderedHomepageSection[], id: string, direction: "up" | "down") {
  const availability = getHomepageMoveAvailability(sections, id);
  if ((direction === "up" && !availability.canMoveUp) || (direction === "down" && !availability.canMoveDown)) return undefined;
  const group = sections.filter((section) => ruleFor(section.type)?.placement === "quiet").sort((a, b) => a.order - b.order);
  const index = group.findIndex((section) => section.id === id);
  return group[index + (direction === "up" ? -1 : 1)];
}

export function getPublicQuietSectionTypes(sections?: Array<{ type: string; order: number }>) {
  if (!sections) return [...fallbackQuietSectionTypes];
  return sections.filter((section) => ruleFor(section.type)?.placement === "quiet").sort((a, b) => a.order - b.order).map((section) => section.type);
}
