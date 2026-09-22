import type { Project } from "@/content/work";

export function caseStudyHref(project: Pick<Project, "slug" | "isCaseStudy">) {
  return project.isCaseStudy ? `/case-studies/${project.slug}` : `/work/${project.slug}`;
}

export function selectCaseStudies(projects: Project[], limit = 5) {
  return projects
    .filter((project) => project.isCaseStudy)
    .sort((a, b) => (a.caseStudyOrder ?? 9999) - (b.caseStudyOrder ?? 9999) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function nextCaseStudy(projects: Project[], slug: string) {
  const ordered = selectCaseStudies(projects);
  const index = ordered.findIndex((project) => project.slug === slug);
  return index >= 0 && ordered.length > 1 ? ordered[(index + 1) % ordered.length] : undefined;
}
