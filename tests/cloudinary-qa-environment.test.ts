import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assertNonProductionCloudinary,
  isNonProductionCloudinary,
} from "../src/lib/media/cloudinary-qa-environment";

test("Cloudinary QA environment accepts only explicit non-production values", () => {
  for (const value of ["development", "test", "qa", "staging", " QA "]) {
    assert.equal(isNonProductionCloudinary(value), true);
    assert.doesNotThrow(() => assertNonProductionCloudinary(value));
  }

  for (const value of [undefined, "", " ", "production", "unknown", "preview"]) {
    assert.equal(isNonProductionCloudinary(value), false);
    assert.throws(
      () => assertNonProductionCloudinary(value),
      /Provider-mutating QA requires CLOUDINARY_ENVIRONMENT/,
    );
  }
});

test("every provider-mutating QA runner contains the fail-closed gate", () => {
  for (const relativePath of [
    "scripts/media-upload-qa.cjs",
    "scripts/media-management-qa.ts",
    "scripts/media-gap-closure-qa.ts",
  ]) {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    assert.match(source, /assertNonProductionCloudinary\(\)/, relativePath);
  }
});
