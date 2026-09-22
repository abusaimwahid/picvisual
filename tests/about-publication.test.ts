import assert from "node:assert/strict";
import test from "node:test";
import { publishedAboutSnapshotToPage, readAboutSnapshot, type AboutPageSnapshot } from "../src/cms/about-publication";

const published: AboutPageSnapshot = { version: 1, title: "Studio", seoTitle: "Studio — PicVisual", seoDescription: "Published description", canonicalUrl: null, indexable: true, ogImageId: "approved-og", sections: [
  { type: "approach", order: 2, enabled: true, content: { heading: "Published approach" } },
  { type: "hero", order: 0, enabled: true, content: { headline: "Published hero", imageMediaId: "approved" } },
  { type: "studioMedia", order: 1, enabled: false, content: { mediaId: "private" } },
] };

test("About published reader preserves order and removes disabled optional sections", () => {
  const page = publishedAboutSnapshotToPage(published);
  assert.deepEqual(page.sections.map((section) => section.type), ["hero", "approach"]);
  assert.equal(page.ogImageId, "approved-og");
});

test("About publication snapshot is isolated from later draft text and media", () => {
  const draft = structuredClone(published);
  (draft.sections[1].content as { headline: string; imageMediaId: string }).headline = "Private draft";
  (draft.sections[1].content as { headline: string; imageMediaId: string }).imageMediaId = "private-media";
  const visible = publishedAboutSnapshotToPage(published);
  assert.equal((visible.sections[0].content as { headline: string }).headline, "Published hero");
  assert.equal((visible.sections[0].content as { imageMediaId: string }).imageMediaId, "approved");
});

test("About preview accepts only versioned structured snapshots", () => {
  assert.equal(readAboutSnapshot(published)?.title, "Studio");
  assert.equal(readAboutSnapshot({ title: "Unversioned", sections: [] }), undefined);
});
