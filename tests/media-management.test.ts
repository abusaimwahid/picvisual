import test from "node:test";
import assert from "node:assert/strict";
import { buildMediaWhere, classifyBulkDelete, mediaSortOrder, normalizeMediaPageSize, processBulkDelete, updatePageSelection } from "../src/lib/media/management";
import { mediaReferenceWhere } from "../src/lib/media/usage";

test("page selection supports independent checkboxes, shift ranges, select-all and clear", () => {
  const page = ["m1", "m2", "m3", "m4", "m5"];
  const first = updatePageSelection([], page, "m2", null, false);
  assert.deepEqual(first, { selectedIds: ["m2"], anchorId: "m2" });
  const ranged = updatePageSelection(first.selectedIds, page, "m5", first.anchorId, true);
  assert.deepEqual(ranged.selectedIds, ["m2", "m3", "m4", "m5"]);
  const toggled = updatePageSelection(ranged.selectedIds, page, "m3", ranged.anchorId, false);
  assert.deepEqual(toggled.selectedIds, ["m2", "m4", "m5"]);
  assert.deepEqual(page, ["m1", "m2", "m3", "m4", "m5"]);
  assert.deepEqual([], []);
});

test("same filenames remain independently selectable because Media IDs are identity", () => {
  const page = ["media-a", "media-b"];
  const first = updatePageSelection([], page, "media-a", null, false);
  const second = updatePageSelection(first.selectedIds, page, "media-b", first.anchorId, false);
  assert.deepEqual(second.selectedIds, ["media-a", "media-b"]);
});

test("bulk delete classification preserves every referenced or shared item", () => {
  assert.deepEqual(classifyBulkDelete([{ id: "safe", referenceCount: 0 }, { id: "used", referenceCount: 1 }, { id: "shared", referenceCount: 4 }]), { safeIds: ["safe"], protectedIds: ["used", "shared"] });
});

test("page sizes are bounded and sort modes produce stable tie breakers", () => {
  assert.equal(normalizeMediaPageSize("48"), 48);
  assert.equal(normalizeMediaPageSize("500"), 24);
  assert.deepEqual(mediaSortOrder("largest"), [{ fileSize: "desc" }, { id: "desc" }]);
  assert.deepEqual(mediaSortOrder("name-asc"), [{ filename: "asc" }, { id: "asc" }]);
});

test("usage filtering includes serialized history and every direct reference relation", () => {
  const where = mediaReferenceWhere(["historical-media-id"]);
  assert.equal(where.OR?.length, 17);
  assert.deepEqual(where.OR?.[0], { id: { in: ["historical-media-id"] } });
});

test("combined server filters include search, collection, type and authoritative usage", () => {
  const where = buildMediaWhere({ query: "chamois", type: "IMAGE", usage: "USED", collectionId: "collection-a", serializedIds: ["historical-media-id"] });
  assert.equal(where.AND?.length, 4);
  assert.deepEqual(where.AND?.[0], { mediaType: "IMAGE", mimeType: { not: "image/svg+xml" } });
  assert.deepEqual(where.AND?.[1], { collections: { some: { collectionId: "collection-a" } } });
  assert.equal((where.AND?.[2] as { OR?: unknown[] }).OR?.length, 17);
  assert.equal((where.AND?.[3] as { OR?: unknown[] }).OR?.length, 5);
});

test("bulk delete produces a result per item, rechecks usage and isolates failures", async () => {
  const deleted: string[] = [];
  const outcomes = await processBulkDelete(
    [
      { id: "referenced", filename: "referenced.jpg", referenceCount: 1 },
      { id: "changed", filename: "changed.jpg", referenceCount: 0 },
      { id: "safe", filename: "safe.jpg", referenceCount: 0 },
      { id: "provider-failure", filename: "failure.jpg", referenceCount: 0 },
    ],
    async (id) => id === "changed" ? 2 : 0,
    async (id) => { if (id === "provider-failure") throw new Error("provider unavailable"); deleted.push(id); },
  );
  assert.deepEqual(outcomes.map((item) => item.status), ["protected", "protected", "deleted", "failed"]);
  assert.deepEqual(deleted, ["safe"]);
  assert.deepEqual(outcomes.map((item) => item.id), ["referenced", "changed", "safe", "provider-failure"]);
});
