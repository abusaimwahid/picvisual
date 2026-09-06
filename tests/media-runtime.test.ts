import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFocalPoint, validateMediaFile } from "../src/lib/media/validation";
import { summarizeMediaUsage } from "../src/lib/media/usage";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);

test("validates image and video signatures with the correct media type", () => {
  assert.equal(validateMediaFile({ name: "asset.png", type: "image/png", size: png.length, bytes: png }).mediaType, "IMAGE");
  assert.equal(validateMediaFile({ name: "clip.mp4", type: "video/mp4", size: mp4.length, bytes: mp4 }).mediaType, "VIDEO");
  assert.throws(() => validateMediaFile({ name: "asset.png", type: "image/png", size: mp4.length, bytes: mp4 }));
});

test("rejects unsafe SVG payloads", () => {
  const unsafe = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
  assert.throws(() => validateMediaFile({ name: "unsafe.svg", type: "image/svg+xml", size: unsafe.length, bytes: unsafe }));
});

test("normalizes focal points to stored percentages", () => {
  assert.equal(normalizeFocalPoint(-2), 0);
  assert.equal(normalizeFocalPoint(50.6), 51);
  assert.equal(normalizeFocalPoint(180), 100);
});

test("summarizes only active media references", () => {
  assert.deepEqual(summarizeMediaUsage({ "Project hero": 1, Clients: 0, Branding: 2 }), [{ label: "Project hero", count: 1 }, { label: "Branding", count: 2 }]);
});
