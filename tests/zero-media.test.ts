import assert from "node:assert/strict";
import test from "node:test";
import { resolvedHomepageMediaIds, sectionHasResolvedMedia } from "../src/components/home/homepage-model";
import { projects } from "../src/content/work";

test("zero-media baseline has no file-backed project fallback", () => {
  assert.deepEqual(projects, []);
});

test("homepage media layouts activate only when a referenced Media record resolves", () => {
  const empty = { type: "imagePost", content: { primaryMediaId: "missing" } };
  const resolved = { type: "motion", content: { posterMediaIds: ["missing", "available"] } };
  assert.equal(sectionHasResolvedMedia(empty, {}), false);
  assert.equal(sectionHasResolvedMedia(resolved, { available: {} }), true);
  assert.deepEqual(resolvedHomepageMediaIds([empty, resolved], { available: {} }), ["available"]);
});
