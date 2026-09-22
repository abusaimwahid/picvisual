import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePage } from "../src/components/home/HomePage";
import type { Project } from "../src/content/work";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function project(index: number): Project {
  return {
    id: `project-${index}`,
    slug: `project-${index}`,
    title: `Project ${index}`,
    category: "Image post-production",
    scope: "Retouching",
    summary: "A real CMS project record without placeholder media.",
    tone: "sky",
    size: "wide",
    services: ["Retouching"],
    featured: true,
  };
}

function render(projects: Project[] = [], sections: Array<{ type: string; content: unknown }> = [], media: Record<string, { publicUrl: string; alt: string; mediaType: "IMAGE"; width: number; height: number }> = {}) {
  return renderToStaticMarkup(React.createElement(HomePage, { content: { projects, services: [], faqs: [], page: { sections }, media } }));
}

test("homepage renders explicit zero, single, and multi-project modes", () => {
  const empty = render();
  assert.match(empty, /data-project-mode="empty"/);
  assert.match(empty, /pvh-work-empty/);
  assert.equal((empty.match(/class="pvh-project"/g) ?? []).length, 0);

  const single = render([project(1)]);
  assert.match(single, /data-project-mode="single"/);
  assert.equal((single.match(/class="pvh-project"/g) ?? []).length, 1);

  const multi = render([project(1), project(2), project(3)]);
  assert.match(multi, /data-project-mode="multi"/);
  assert.equal((multi.match(/class="pvh-project"/g) ?? []).length, 3);
});

test("homepage activates real media only for resolved CMS references", () => {
  const media = Object.fromEntries(["hero-media", "craft-a", "craft-b"].map((id) => [id, {
    publicUrl: `/qa/${id}.jpg`, alt: id, mediaType: "IMAGE" as const, width: 1200, height: 900,
  }]));
  const sections = [
    { type: "hero", content: { primaryMediaId: "hero-media" } },
    { type: "imagePost", content: { primaryMediaId: "craft-a", secondaryMediaId: "craft-b" } },
  ];
  const markup = render([], sections, media);
  assert.match(markup, /data-media-mode="media"/);
  assert.match(markup, /pvh-hero has-media/);
  assert.equal((markup.match(/<figure/g) ?? []).length, 2);
});
