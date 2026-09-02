import type { Project as PublicProject } from "@/content/work";
import type { Service as PublicService } from "@/content/services";
import type { Project, Service } from "@prisma/client";

// Kept separate so the approved components can migrate to Prisma data without a visual rewrite.
export function mapProjectToPublicProject(project: Project): PublicProject { return { slug: project.slug, title: project.title, category: project.category, scope: project.services[0] ?? "Post-production", summary: project.summary, services: project.services, tone: "sky", size: "wide" }; }
export function mapServiceToPublicService(service: Service, index: number): PublicService { return { title: service.title, shortTitle: service.category, description: service.shortDescription, items: service.description?.split("\n").filter(Boolean) ?? [], index: String(index + 1).padStart(2, "0") }; }
