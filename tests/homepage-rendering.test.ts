import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageConfigContext } from "next/dist/shared/lib/image-config-context.shared-runtime";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import { HomePage } from "../src/components/home/HomePage";
import type { Project } from "../src/content/work";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const imageConfig = { ...imageConfigDefault, qualities: [75, 90], remotePatterns: [{ protocol: "https" as const, hostname: "res.cloudinary.com", pathname: "/**" }] };
const renderWithImageConfig = (element: React.ReactElement) => renderToStaticMarkup(React.createElement(ImageConfigContext.Provider, { value: imageConfig }, element));

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

function render(projects: Project[] = [], sections: Array<{ type: string; content: unknown }> = [], media: Record<string, { publicUrl: string; alt: string; mediaType: "IMAGE" | "VIDEO"; width: number; height: number }> = {}) {
  return renderWithImageConfig(React.createElement(HomePage, { content: { projects, services: [], faqs: [], page: { sections }, media } }));
}

test("homepage renders explicit zero, single, and multi-project modes", () => {
  const empty = render();
  assert.match(empty, /data-project-mode="empty"/);
  assert.match(empty, /pvh-sample-projects/);
  assert.match(empty, /Sample concept/);
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
  assert.match(markup, /data-media-mode="cms"/);
  assert.match(markup, /pvh-hero has-media/);
  assert.match(markup, /url=%2Fqa%2Fhero-media\.jpg/);
  assert.match(markup, /url=%2Fqa%2Fcraft-a\.jpg/);
});

test("homepage video mode renders a cinematic video with its configured poster", () => {
  const markup = render([], [{ type: "hero", content: { mediaMode: "VIDEO", videoMediaId: "hero-video", posterMediaId: "hero-poster" } }], {
    "hero-video": { publicUrl: "/qa/hero.mp4", alt: "Hero film", mediaType: "VIDEO", width: 1920, height: 1080 },
    "hero-poster": { publicUrl: "/qa/hero-poster.jpg", alt: "Hero poster", mediaType: "IMAGE", width: 1920, height: 1080 },
  });
  assert.match(markup, /<video[^>]+src="\/qa\/hero\.mp4"/);
  assert.match(markup, /poster="\/qa\/hero-poster\.jpg"/);
  assert.match(markup, /autoPlay=""/);
  assert.match(markup, /muted=""/);
  assert.match(markup, /playsInline=""/);
  assert.match(markup, /loop=""/);
  assert.doesNotMatch(markup, /controls=""/);
});

test("homepage supplies a labeled demo gallery and preserves configured service media", () => {
  const serviceMedia = { publicUrl: "/qa/service.jpg", alt: "Service still", width: 1200, height: 800 };
  const markup = renderWithImageConfig(React.createElement(HomePage, { content: {
    projects: [],
    faqs: [],
    services: [{ title: "Retouching", shortTitle: "Retouching", description: "A considered finish.", items: [], index: "01", hero: serviceMedia }],
    page: { sections: [] },
    media: {},
  } }));
  assert.match(markup, /pvh-gallery/);
  assert.match(markup, /data-source="demo"/);
  assert.match(markup, /Sample visual/);
  assert.match(markup, /pvh-service-row3d is-active/);
  assert.match(markup, /pvh-service-visual-stage has-media/);
  assert.match(markup, /pvh-service-visual is-active/);
  assert.match(markup, /url=%2Fqa%2Fservice\.jpg/);
});
