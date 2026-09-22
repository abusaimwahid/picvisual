export function filterGalleryBatch(selectedIds: string[], existingIds: Iterable<string>) {
  const existing = new Set(existingIds);
  const seen = new Set<string>();
  const added: string[] = [];
  let duplicateCount = 0;
  for (const id of selectedIds) {
    if (!id || existing.has(id) || seen.has(id)) { duplicateCount += 1; continue; }
    seen.add(id);
    added.push(id);
  }
  return { added, duplicateCount };
}
