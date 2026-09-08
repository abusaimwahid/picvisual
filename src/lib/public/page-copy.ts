import { notFound } from "next/navigation";
import { pageCopy } from "@/content/pages";
import { getPublicPageContent } from "./readers";
export async function getPageCopy(slug: keyof typeof pageCopy) {
  const result = await getPublicPageContent(slug);
  if (result.source === "cms" && !result.data) notFound();
  const page = result.data;
  const content = page?.sections.find((section) => section.type === "richText")?.content as { body?: string; approachHeading?: string; approachBody?: string } | undefined;
  return { title: page?.title || pageCopy[slug].title, body: content?.body ?? pageCopy[slug].body, approachHeading: content?.approachHeading ?? pageCopy[slug].approachHeading, approachBody: content?.approachBody ?? pageCopy[slug].approachBody };
}
