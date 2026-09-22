import assert from "node:assert/strict";
import test from "node:test";
import type { Project as PrismaProject } from "@prisma/client";
import type { Project } from "../src/content/work";
import { caseStudyHref, nextCaseStudy, selectCaseStudies } from "../src/cms/case-studies";
import { publishedProject, snapshotJson } from "../src/cms/catalog-publication";

const project = (title: string, order: number | null, isCaseStudy = true): Project => ({ slug: title.toLowerCase(), title, category: "Editorial", scope: "Selected imagery", summary: `${title} summary`, tone: "sky", size: "wide", services: [], isCaseStudy, caseStudyOrder: order });

test("Case Studies filters work-only records, uses explicit order, and caps the index at five", () => {
  const input = [project("Six", 6), project("Three", 3), project("Work", 0, false), project("One", 1), project("Five", 5), project("Two", 2), project("Four", 4)];
  assert.deepEqual(selectCaseStudies(input).map((item) => item.title), ["One", "Two", "Three", "Four", "Five"]);
  assert.equal(caseStudyHref(input[2]), "/work/work");
  assert.equal(caseStudyHref(input[3]), "/case-studies/one");
});

test("Next Case Study follows published editorial order and wraps without work-only records", () => {
  const input = [project("Second", 2), project("Portfolio", 0, false), project("First", 1)];
  assert.equal(nextCaseStudy(input, "first")?.slug, "second");
  assert.equal(nextCaseStudy(input, "second")?.slug, "first");
  assert.equal(nextCaseStudy([project("Only", 0)], "only"), undefined);
});

test("Case Study selection scales cleanly from one through five records", () => {
  const input = [1, 2, 3, 4, 5].map((value) => project(`Case ${value}`, value));
  for (let count = 1; count <= 5; count += 1) assert.equal(selectCaseStudies(input.slice(0, count)).length, count);
});

test("Project publication excludes drafts and archives and freezes case-study story plus gallery order", () => {
  const baseline = { id: "case", status: "PUBLISHED", isCaseStudy: true, caseStudyOrder: 1, challenge: "Published context", media: [{ mediaId: "first", order: 0, layout: "FULL" }, { mediaId: "second", order: 1, layout: "DETAIL" }] } as unknown as PrismaProject;
  const edited = { ...baseline, challenge: "Private edit", caseStudyOrder: 9, media: [{ mediaId: "second", order: 0, layout: "OFFSET" }], publishedSnapshot: snapshotJson(baseline) } as PrismaProject;
  const visible = publishedProject(edited)!;
  assert.equal(visible.challenge, "Published context");
  assert.equal(visible.caseStudyOrder, 1);
  assert.deepEqual(visible.media?.map((item) => item.mediaId), ["first", "second"]);
  assert.equal(publishedProject({ ...edited, status: "DRAFT" }), undefined);
  assert.equal(publishedProject({ ...edited, status: "ARCHIVED" }), undefined);
});
