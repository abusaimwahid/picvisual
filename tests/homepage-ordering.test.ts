import assert from "node:assert/strict";
import test from "node:test";
import { getHomepageMoveAvailability, getHomepageMoveTarget, getPublicQuietSectionTypes } from "../src/cms/homepage-ordering";

const sections = [
  { id: "hero", type: "hero", order: 0 },
  { id: "workflow", type: "productionWorkflow", order: 6 },
  { id: "why", type: "whyPicVisual", order: 7 },
  { id: "faq", type: "faq", order: 8 },
  { id: "cta", type: "cta", order: 9 },
];

test("homepage fixed sections cannot move", () => {
  assert.deepEqual(getHomepageMoveAvailability(sections, "hero"), { canMoveUp: false, canMoveDown: false });
  assert.equal(getHomepageMoveTarget(sections, "cta", "up"), undefined);
});

test("homepage quiet sections move only within their safe group", () => {
  assert.deepEqual(getHomepageMoveAvailability(sections, "why"), { canMoveUp: true, canMoveDown: true });
  assert.equal(getHomepageMoveTarget(sections, "why", "down")?.id, "faq");
  assert.equal(getHomepageMoveTarget(sections, "workflow", "up"), undefined);
});

test("public quiet section mapping follows CMS order and omits disabled records", () => {
  assert.deepEqual(getPublicQuietSectionTypes([{ type: "faq", order: 6 }, { type: "whyPicVisual", order: 7 }, { type: "productionWorkflow", order: 8 }]), ["faq", "whyPicVisual", "productionWorkflow"]);
  assert.deepEqual(getPublicQuietSectionTypes([{ type: "productionWorkflow", order: 6 }, { type: "faq", order: 8 }]), ["productionWorkflow", "faq"]);
});
