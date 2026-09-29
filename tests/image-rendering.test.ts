import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageConfigContext } from "next/dist/shared/lib/image-config-context.shared-runtime";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import { CmsImage } from "../src/components/ui/CmsImage";
import { HomePage } from "../src/components/home/HomePage";
import { classifyImageSource } from "../src/lib/media/image-source";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const root = process.cwd();
const imageConfig = { ...imageConfigDefault, qualities: [75, 90], remotePatterns: [{ protocol: "https" as const, hostname: "res.cloudinary.com", pathname: "/**" }] };
const renderImage = (element: React.ReactElement) => renderToStaticMarkup(React.createElement(ImageConfigContext.Provider, { value: imageConfig }, element));

test("Next image configuration has no global or component-level custom loader", () => {
  const config = readFileSync(join(root, "next.config.ts"), "utf8");
  const component = readFileSync(join(root, "src/components/ui/CmsImage.tsx"), "utf8");
  assert.doesNotMatch(config, /\bloader(File)?\s*:/);
  assert.doesNotMatch(component, /\bloader\s*=/);
  assert.equal(existsSync(join(root, "src/lib/media/image-loader.ts")), false);
  assert.match(config, /hostname:\s*["']res\.cloudinary\.com["']/);
});

test("official logo remains a real static import rendered by standard Next Image", () => {
  const component = readFileSync(join(root, "src/components/ui/BrandLogo.tsx"), "utf8");
  assert.equal(existsSync(join(root, "public/brand/picvisual-logo.png")), true);
  assert.match(component, /import logo from ["']\.\.\/\.\.\/\.\.\/public\/brand\/picvisual-logo\.png["']/);
  assert.match(component, /<Image[^>]+src=\{logo\}/);
  assert.doesNotMatch(component, /\bloader\s*=/);
});

test("CmsImage renders local demo, static import data, and Cloudinary CMS sources through the default loader", () => {
  const local = renderImage(React.createElement(CmsImage, { asset: { publicUrl: "/demo/home/hero-product.jpg", alt: "Hero", width: 1536, height: 1024 } }));
  assert.match(local, /hero-product\.jpg/);

  const staticImport = renderImage(React.createElement(CmsImage, { asset: { src: "/_next/static/media/picvisual-logo.test.png", width: 4500, height: 4500 }, alt: "PicVisual" }));
  assert.match(staticImport, /picvisual-logo\.test\.png/);

  const remote = renderImage(React.createElement(CmsImage, { asset: { publicUrl: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg", alt: "CMS image", width: 1200, height: 800 } }));
  assert.match(remote, /res\.cloudinary\.com/);
  assert.equal(classifyImageSource("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"), "cloudinary");
});

test("CmsImage treats missing, empty, or unsupported CMS image sources as absent", () => {
  assert.equal(renderToStaticMarkup(React.createElement(CmsImage, { asset: null })), "");
  assert.equal(renderToStaticMarkup(React.createElement(CmsImage, { asset: { publicUrl: "", alt: "", width: 0, height: Number.NaN } })), "");
  assert.equal(renderToStaticMarkup(React.createElement(CmsImage, { asset: { publicUrl: "https://example.com/not-allowed.jpg", alt: "", width: 100, height: 100 } })), "");
});

test("invalid or missing homepage CMS media cannot override the local hero and service fallbacks", () => {
  const markup = renderImage(React.createElement(HomePage, { content: {
    projects: [],
    services: [{ title: "Retouching", shortTitle: "Retouching", description: "Finish", items: [], index: "01", hero: { publicUrl: "", alt: null, width: null, height: null } }],
    faqs: [],
    page: { sections: [{ type: "hero", content: { primaryMediaId: "missing-image" } }] },
    media: { "missing-image": { publicUrl: "https://example.com/missing.jpg", alt: "Missing", mediaType: "IMAGE", width: 1200, height: 800 } },
  } }));
  assert.match(markup, /cinematic-film-frame\.jpg/);
  assert.match(markup, /beauty-detail-study\.jpg/);
  assert.match(markup, /data-media-mode="demo"/);
});

test("every bundled homepage demo image exists", () => {
  for (const filename of [
    "hero-product.jpg", "fashion-beauty.jpg", "beauty-detail-study.jpg",
    "product-ecommerce.jpg", "product-material-study.jpg", "jewelry-macro.jpg",
    "motion-color.jpg", "creative-composite.jpg", "creative-material-study.jpg",
  ]) assert.equal(existsSync(join(root, "public/demo/home", filename)), true, filename);
});
