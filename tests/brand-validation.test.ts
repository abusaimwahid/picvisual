import assert from "node:assert/strict";
import test from "node:test";
import { validateBrandAsset, validateSvg } from "../src/lib/media/brand-validation";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const webp = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');

test("accepts PNG, WebP and safe SVG main logos", () => {
  assert.doesNotThrow(() => validateBrandAsset("mainLogo", { name: "logo.png", type: "image/png", size: png.length, bytes: png }));
  assert.doesNotThrow(() => validateBrandAsset("mainLogo", { name: "logo.webp", type: "image/webp", size: webp.length, bytes: webp }));
  assert.doesNotThrow(() => validateBrandAsset("mainLogo", { name: "logo.svg", type: "image/svg+xml", size: svg.length, bytes: svg }));
});

test("rejects JPEG, oversized assets and unsafe SVG", () => {
  assert.throws(() => validateBrandAsset("mainLogo", { name: "logo.jpg", type: "image/jpeg", size: png.length, bytes: png }));
  assert.throws(() => validateBrandAsset("mainLogo", { name: "logo.png", type: "image/png", size: 2 * 1024 * 1024 + 1, bytes: png }));
  assert.throws(() => validateSvg('<svg><script>alert(1)</script></svg>'));
  assert.throws(() => validateSvg('<svg onload="alert(1)"></svg>'));
  assert.throws(() => validateSvg('<svg><use href="https://unsafe.example/logo.svg" /></svg>'));
});

test("accepts favicon-specific formats only", () => {
  assert.doesNotThrow(() => validateBrandAsset("favicon", { name: "favicon.svg", type: "image/svg+xml", size: svg.length, bytes: svg }));
  assert.throws(() => validateBrandAsset("socialLogo", { name: "logo.svg", type: "image/svg+xml", size: svg.length, bytes: svg }));
});
