import assert from "node:assert/strict";
import test from "node:test";
import { publishedSnapshotToPage, readHomepageSnapshot, type HomepageSnapshot } from "@/cms/homepage-publication";

const snapshot: HomepageSnapshot = { version: 1, title: "Home", seoTitle: null, seoDescription: null, sections: [
  { type: "hero", order: 0, enabled: true, theme: null, content: { headline: "Published" }, settings: null },
  { type: "faq", order: 1, enabled: false, theme: null, content: { heading: "FAQ" }, settings: null },
] };

test("published snapshots retain only enabled sections for the public reader", () => {
  assert.deepEqual(publishedSnapshotToPage(snapshot).sections, [{ type: "hero", content: { headline: "Published" }, order: 0 }]);
});

test("only versioned homepage snapshots are accepted", () => {
  assert.equal(readHomepageSnapshot(snapshot)?.title, "Home");
  assert.equal(readHomepageSnapshot({ title: "unversioned", sections: [] }), undefined);
});
