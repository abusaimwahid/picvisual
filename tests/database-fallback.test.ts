import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabaseUrl } from "../src/lib/db/client";

test("database-less fallback can be forced for release validation without touching configured credentials", () => {
  const beforeUrl = process.env.DATABASE_URL;
  const beforeDisabled = process.env.PICVISUAL_DATABASE_DISABLED;
  try {
    process.env.DATABASE_URL = "postgresql://configured.invalid/example";
    delete process.env.PICVISUAL_DATABASE_DISABLED;
    assert.equal(hasDatabaseUrl(), true);
    process.env.PICVISUAL_DATABASE_DISABLED = "1";
    assert.equal(hasDatabaseUrl(), false);
  } finally {
    if (beforeUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = beforeUrl;
    if (beforeDisabled === undefined) delete process.env.PICVISUAL_DATABASE_DISABLED; else process.env.PICVISUAL_DATABASE_DISABLED = beforeDisabled;
  }
});
