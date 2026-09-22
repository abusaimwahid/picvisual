import test from "node:test";
import assert from "node:assert/strict";
import { buildMediaWhere, classifyMediaAspect } from "../src/lib/media/management";
import { CLIENT_CONTENT_HASH_LIMIT, hashBrowserBlob, sameExactContent, sha256Bytes } from "../src/lib/media/content-hash";
import { reserveBatchContentHash } from "../src/lib/media/upload-queue";

test("aspect classification uses a 5% square tolerance and preserves unknown dimensions", () => {
  assert.equal(classifyMediaAspect(1600, 900), "LANDSCAPE");
  assert.equal(classifyMediaAspect(900, 1600), "PORTRAIT");
  assert.equal(classifyMediaAspect(1000, 960), "SQUARE");
  assert.equal(classifyMediaAspect(1000, 940), "LANDSCAPE");
  assert.equal(classifyMediaAspect(null, 900), null);
  assert.equal(classifyMediaAspect(900, 0), null);
});

test("exact identity is content-derived and independent of filename", async () => {
  const first = await sha256Bytes(new TextEncoder().encode("asset A"));
  const renamed = await sha256Bytes(new TextEncoder().encode("asset A"));
  const sameFilenameDifferentBytes = await sha256Bytes(new TextEncoder().encode("asset B"));
  assert.equal(first, "c2b9e1b8e86b42590ed47200cdd915aac4df5c348ae7db7b1be694ea686081b3");
  assert.equal(sameExactContent(first, renamed), true);
  assert.equal(sameExactContent(first, sameFilenameDifferentBytes), false);
});

test("same-batch content reservations produce a non-blocking duplicate conflict", () => {
  const owners = new Map<string, string>();
  assert.deepEqual(reserveBatchContentHash(owners, "a".repeat(64), "queue-a"), { duplicateOf: null });
  assert.deepEqual(reserveBatchContentHash(owners, "a".repeat(64), "queue-copy"), { duplicateOf: "queue-a" });
  assert.deepEqual(reserveBatchContentHash(owners, "b".repeat(64), "same-filename-different-content"), { duplicateOf: null });
});

test("large browser files skip whole-buffer hashing while normal files receive SHA-256", async () => {
  const ordinary = new Blob(["ordinary"]);
  assert.match((await hashBrowserBlob(ordinary)) ?? "", /^[a-f0-9]{64}$/);
  const oversized = { size: CLIENT_CONTENT_HASH_LIMIT + 1, arrayBuffer: async () => { throw new Error("must not allocate"); } } as unknown as Blob;
  assert.equal(await hashBrowserBlob(oversized), null);
});

test("tag, aspect, collection, type, usage and search remain one paginated server filter", () => {
  const where = buildMediaWhere({ query: "jewelry", type: "IMAGE", usage: "USED", collectionId: "collection", tagId: "tag", aspect: "SQUARE", serializedIds: ["history"] });
  assert.equal(where.AND?.length, 6);
  assert.deepEqual(where.AND?.[2], { tags: { some: { tagId: "tag" } } });
  assert.deepEqual(where.AND?.[3], { aspectClass: "SQUARE" });
  assert.equal((where.AND?.[5] as { OR?: unknown[] }).OR?.length, 5);
});
