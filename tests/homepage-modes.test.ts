import assert from "node:assert/strict";
import test from "node:test";
import { homepageProjectMode } from "../src/components/home/homepage-model";

test("Selected Work switches between static empty, single, and multi-project layouts", () => {
  assert.equal(homepageProjectMode(0), "empty");
  assert.equal(homepageProjectMode(1), "single");
  assert.equal(homepageProjectMode(2), "multi");
  assert.equal(homepageProjectMode(3), "multi");
  assert.equal(homepageProjectMode(5), "multi");
});
