import test from "node:test";
import assert from "node:assert/strict";
import { cancelQueued, cloudUploadParts, DIRECT_UPLOAD_CHUNK_SIZE, DIRECT_UPLOAD_CHUNK_THRESHOLD, fileQueueIdentity, humanFileSize, MEDIA_UPLOAD_CONCURRENCY, nextQueuedIds, overallUploadProgress, retryFailed, uploadSummary, type UploadProgressRecord } from "../src/lib/media/upload-queue";
import { filterGalleryBatch } from "../src/cms/gallery-batch";

const item = (id: string, status: UploadProgressRecord["status"], size = 100, uploadedBytes = 0): UploadProgressRecord => ({ id, status, size, uploadedBytes });

test("upload queue preserves selection order and fills only available concurrency slots", () => {
  const records = [item("first", "QUEUED"), item("second", "QUEUED"), item("third", "QUEUED"), item("fourth", "QUEUED")];
  assert.equal(MEDIA_UPLOAD_CONCURRENCY, 3);
  assert.deepEqual(nextQueuedIds(records, new Set()), ["first", "second", "third"]);
  assert.deepEqual(nextQueuedIds(records, new Set(["active-a", "active-b"])), ["first"]);
});

test("byte-weighted progress includes completed and finalizing files accurately", () => {
  const progress = overallUploadProgress([item("large", "UPLOADING", 900, 300), item("small", "COMPLETE", 100, 0), item("queued", "QUEUED", 100, 0), item("final", "FINALIZING", 100, 50)]);
  assert.deepEqual(progress, { totalBytes: 1200, uploadedBytes: 500, percent: 42 });
  assert.deepEqual(uploadSummary([item("a", "COMPLETE"), item("b", "UPLOADING"), item("c", "FINALIZING"), item("d", "QUEUED"), item("e", "VALIDATING"), item("f", "FAILED"), item("g", "CANCELED")]), { total: 7, queued: 2, uploading: 2, complete: 1, duplicate: 0, failed: 1, canceled: 1 });
});

test("failed uploads retry independently and queued uploads cancel independently", () => {
  assert.deepEqual(retryFailed(item("failed", "FAILED", 100, 75)), item("failed", "QUEUED", 100, 0));
  assert.deepEqual(retryFailed(item("done", "COMPLETE", 100, 100)), item("done", "COMPLETE", 100, 100));
  assert.deepEqual(cancelQueued(item("waiting", "QUEUED", 100, 0)), item("waiting", "CANCELED", 100, 0));
});

test("queue identity allows duplicate filenames but catches the same selected file", () => {
  const first = { name: "IMG_0001.jpg", size: 20, type: "image/jpeg", lastModified: 1 } as File;
  const sameSelection = { ...first } as File;
  const differentAsset = { ...first, size: 21 } as File;
  assert.equal(fileQueueIdentity(first), fileQueueIdentity(sameSelection));
  assert.notEqual(fileQueueIdentity(first), fileQueueIdentity(differentAsset));
  assert.equal(humanFileSize(8.4 * 1024 * 1024), "8.4 MB");
});

test("Cloudinary upload parts switch to contiguous 8 MB chunks only above 100 MB", () => {
  assert.deepEqual(cloudUploadParts(DIRECT_UPLOAD_CHUNK_THRESHOLD), [{ start: 0, end: DIRECT_UPLOAD_CHUNK_THRESHOLD }]);

  const size = DIRECT_UPLOAD_CHUNK_THRESHOLD + 3;
  const parts = cloudUploadParts(size);
  assert.equal(parts[0]?.start, 0);
  assert.equal(parts[0]?.end, DIRECT_UPLOAD_CHUNK_SIZE);
  assert.equal(parts.at(-1)?.end, size);
  assert.equal(parts.every((part, index) => index === 0 || parts[index - 1]?.end === part.start), true);
  assert.equal(parts.slice(0, -1).every((part) => part.end - part.start === DIRECT_UPLOAD_CHUNK_SIZE), true);
});

test("gallery batch keeps first-seen order and filters existing or repeated media IDs", () => {
  assert.deepEqual(filterGalleryBatch(["m3", "m1", "m3", "m2", "m4"], ["m1", "m2"]), { added: ["m3", "m4"], duplicateCount: 3 });
});
