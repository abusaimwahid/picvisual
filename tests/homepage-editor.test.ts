import assert from "node:assert/strict";
import test from "node:test";
import { hasAllowedMediaKinds, protectedHomepageSectionTypes, sectionMediaRequirements } from "../src/cms/homepage-editor";
import { validateSection } from "../src/cms/types/sections";

const image = "clh9f8s1a0000w0a1b2c3d4e5";
const video = "clh9f8s1a0001w0a1b2c3d4e5";

test("validates structured immersive section content", () => {
  assert.doesNotThrow(() => validateSection("imagePost", { label: "IMAGE POST", heading: "Heading", description: "Description", rawMediaId: image, finishedMediaId: image, detailMediaIds: [] }));
  assert.throws(() => validateSection("video", { mediaId: "not-a-cuid" }));
});

test("rejects media records with a mismatched server-side media type", () => {
  const requirements = sectionMediaRequirements("videoEdit", { label: "VIDEO", heading: "Heading", description: "Description", videoMediaId: video, posterMediaId: image, timelineMediaIds: [image] });
  assert.equal(hasAllowedMediaKinds(requirements, [{ id: video, mediaType: "VIDEO" }, { id: image, mediaType: "IMAGE" }]), true);
  assert.equal(hasAllowedMediaKinds(requirements, [{ id: video, mediaType: "IMAGE" }, { id: image, mediaType: "IMAGE" }]), false);
});

test("keeps critical homepage sections protected from deletion", () => {
  assert.equal(protectedHomepageSectionTypes.has("hero"), true);
  assert.equal(protectedHomepageSectionTypes.has("positioning"), true);
  assert.equal(protectedHomepageSectionTypes.has("cta"), true);
  assert.equal(protectedHomepageSectionTypes.has("imagePost"), false);
});
