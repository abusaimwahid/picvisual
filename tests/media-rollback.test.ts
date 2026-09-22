import test from "node:test";
import assert from "node:assert/strict";
import { withProviderRollback } from "../src/lib/media/rollback";

test("provider rollback runs when Media finalization fails and preserves the original error", async () => {
  const events: string[] = [];
  await assert.rejects(
    withProviderRollback(async () => { events.push("finalize"); throw new Error("database unavailable"); }, async () => { events.push("provider-delete"); }),
    /database unavailable/,
  );
  assert.deepEqual(events, ["finalize", "provider-delete"]);
});

test("provider rollback failure does not mask the Media finalization error", async () => {
  await assert.rejects(
    withProviderRollback(async () => { throw new Error("finalize failed"); }, async () => { throw new Error("delete failed"); }),
    /finalize failed/,
  );
});

test("successful Media finalization does not run provider rollback", async () => {
  let rolledBack = false;
  const result = await withProviderRollback(async () => "media-id", async () => { rolledBack = true; });
  assert.equal(result, "media-id");
  assert.equal(rolledBack, false);
});
