"use client";

/* eslint-disable @next/next/no-img-element -- Media Library uses runtime provider URLs and preserves original asset dimensions. */
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkAddMediaToCollection,
  bulkAddMediaToProjectGallery,
  bulkAddMediaToTags,
  bulkDeleteMedia,
  bulkRemoveMediaFromCollection,
  bulkRemoveMediaFromTags,
  bulkUpdateMediaMetadata,
  saveMediaMetadata,
} from "@/app/admin/actions";
import type { BulkDeleteActionState } from "@/app/admin/actions";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { StatusBadge } from "@/components/admin/AdminPrimitives";
import { classifyBulkDelete, classifyMediaAspect, updatePageSelection } from "@/lib/media/management";
import { humanFileSize } from "@/lib/media/upload-queue";

export type ManagedMedia = {
  id: string; filename: string; publicUrl: string; mediaType: "IMAGE" | "VIDEO"; mimeType: string;
  fileSize: number | null; width: number | null; height: number | null; duration: number | null;
  storageProvider: string; createdAt: string; alt: string | null; caption: string | null; focalX: number | null; focalY: number | null;
  contentHash: string | null; aspectClass: string | null; duplicateCount: number;
  collections: Array<{ collection: { id: string; name: string } }>;
  tags: Array<{ tag: { id: string; name: string } }>;
  usage: { referenceCount: number; usage: Array<{ label: string; count: number; locations?: string[] }> };
};

type Collection = { id: string; name: string; count: number };
type Tag = { id: string; name: string; count: number };
type Project = { id: string; title: string; status: string };
type Panel = "metadata" | "collection" | "gallery" | "delete" | null;

function HiddenSelection({ ids }: { ids: string[] }) {
  return <>{ids.map((id) => <input key={id} type="hidden" name="mediaIds" value={id} />)}</>;
}

export function MediaLibraryManager({ items, collections, tags, projects, returnTo, selectionScope }: { items: ManagedMedia[]; collections: Collection[]; tags: Tag[]; projects: Project[]; returnTo: string; selectionScope: string }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [metadata, setMetadata] = useState<Record<string, { alt: string; caption: string }>>({});
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const handledDeleteRef = useRef("");
  const [deleteState, deleteAction, deletePending] = useActionState(bulkDeleteMedia, { operationId: "", outcomes: [] } satisfies BulkDeleteActionState);
  const pageIds = useMemo(() => items.map((item) => item.id), [items]);
  const selected = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);
  const classification = useMemo(() => classifyBulkDelete(selected.map((item) => ({ id: item.id, referenceCount: item.usage.referenceCount }))), [selected]);

  useEffect(() => { setSelectedIds([]); setAnchorId(null); setPanel(null); }, [selectionScope]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (panel) setPanel(null); else if (selectedIds.length) { setSelectedIds([]); setAnchorId(null); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, selectedIds.length]);
  useEffect(() => { if (panel === "delete") dialogCloseRef.current?.focus(); }, [panel]);
  useEffect(() => {
    if (!deleteState.operationId || handledDeleteRef.current === deleteState.operationId) return;
    handledDeleteRef.current = deleteState.operationId;
    const deletedIds = new Set(deleteState.outcomes.filter((item) => item.status === "deleted").map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => !deletedIds.has(id)));
    setPanel(null);
    if (deletedIds.size) router.refresh();
  }, [deleteState, router]);

  const choose = (id: string, shiftKey: boolean) => {
    const next = updatePageSelection(selectedIds, pageIds, id, anchorId, shiftKey);
    setSelectedIds(next.selectedIds); setAnchorId(next.anchorId); setPanel(null);
  };
  const openMetadata = () => {
    setMetadata(Object.fromEntries(selected.map((item) => [item.id, { alt: item.alt ?? "", caption: item.caption ?? "" }])));
    setPanel("metadata");
  };

  return <div className="media-management">
    <div className="media-selection-row">
      <label><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={(event) => { setSelectedIds(event.target.checked ? pageIds : []); setAnchorId(null); setPanel(null); }} /> Select all on this page</label>
      <span role="status" aria-live="polite"><strong>{selectedIds.length}</strong> selected</span>
      {selectedIds.length > 0 && <button type="button" onClick={() => { setSelectedIds([]); setAnchorId(null); setPanel(null); }}>Clear selection</button>}
      <small>Selection is scoped to this page and clears when filters or pagination change. Shift-click selects a range.</small>
    </div>

    {deleteState.operationId && <section className="media-delete-results" aria-live="polite" aria-label="Bulk delete results">
      <div><strong>Bulk delete complete</strong><span>{deleteState.outcomes.filter((item) => item.status === "deleted").length} deleted · {deleteState.outcomes.filter((item) => item.status === "protected").length} protected · {deleteState.outcomes.filter((item) => item.status === "failed").length} failed</span></div>
      {deleteState.error ? <p role="alert">{deleteState.error}</p> : <ul>{deleteState.outcomes.map((item) => <li key={item.id}><b>{item.status.toUpperCase()}</b><span>{item.filename}</span><small>{item.message}</small></li>)}</ul>}
    </section>}

    {selectedIds.length > 0 && <section className="media-bulk-toolbar" aria-label="Bulk actions">
      <div><strong>{selectedIds.length} selected</strong><span>{classification.safeIds.length} safe to delete · {classification.protectedIds.length} currently in use</span></div>
      <div>
        <button type="button" onClick={openMetadata}>Edit metadata</button>
        <button type="button" onClick={() => setPanel(panel === "collection" ? null : "collection")}>Collections &amp; tags</button>
        <button type="button" onClick={() => setPanel(panel === "gallery" ? null : "gallery")} disabled={!projects.length}>Add to gallery</button>
        <button type="button" className="admin-danger" onClick={() => setPanel("delete")}>Delete</button>
      </div>
    </section>}

    {panel === "metadata" && <section className="media-bulk-panel" aria-labelledby="bulk-metadata-title">
      <div className="media-bulk-panel-heading"><div><h3 id="bulk-metadata-title">Edit metadata individually</h3><p>No shared text is applied automatically.</p></div><button type="button" onClick={() => setPanel(null)}>Close</button></div>
      <form action={bulkUpdateMediaMetadata} className="admin-content-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="updates" value={JSON.stringify(selected.map((item) => ({ id: item.id, ...(metadata[item.id] ?? { alt: item.alt ?? "", caption: item.caption ?? "" }) })))} />
        <div className="media-bulk-metadata-list">{selected.map((item) => <fieldset key={item.id}><legend>{item.filename}</legend><label>Alt text<input value={metadata[item.id]?.alt ?? ""} onChange={(event) => setMetadata((current) => ({ ...current, [item.id]: { alt: event.target.value, caption: current[item.id]?.caption ?? "" } }))} /></label><label>Caption<textarea rows={2} value={metadata[item.id]?.caption ?? ""} onChange={(event) => setMetadata((current) => ({ ...current, [item.id]: { alt: current[item.id]?.alt ?? "", caption: event.target.value } }))} /></label></fieldset>)}</div>
        <button type="submit">Save {selected.length} metadata record{selected.length === 1 ? "" : "s"}</button>
      </form>
    </section>}

    {panel === "collection" && <section className="media-bulk-panel" aria-labelledby="bulk-collection-title">
      <div className="media-bulk-panel-heading"><div><h3 id="bulk-collection-title">Collections and tags</h3><p>Collections are curated groups; tags are reusable descriptive labels. Removing either never deletes Media.</p></div><button type="button" onClick={() => setPanel(null)}>Close</button></div>
      <div className="media-bulk-forms"><form action={bulkAddMediaToCollection} className="admin-content-form"><HiddenSelection ids={selectedIds} /><input type="hidden" name="returnTo" value={returnTo} /><label>Existing collection<select name="collectionId" defaultValue=""><option value="">Choose collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><label>Or create a collection<input name="newCollectionName" maxLength={80} placeholder="Collection name" /></label><button>Add selected media</button></form><form action={bulkRemoveMediaFromCollection} className="admin-content-form"><HiddenSelection ids={selectedIds} /><input type="hidden" name="returnTo" value={returnTo} /><label>Remove from collection<select name="collectionId" required defaultValue=""><option value="" disabled>Choose collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><p className="admin-field-help">Only membership is removed. All selected assets stay in the Media Library.</p><button>Remove membership</button></form></div>
      <div className="media-bulk-forms"><form action={bulkAddMediaToTags} className="admin-content-form"><HiddenSelection ids={selectedIds} /><input type="hidden" name="returnTo" value={returnTo} /><label>Add one or more tags<select name="tagIds" multiple size={Math.min(6, Math.max(2, tags.length))}>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label><label>Or create a tag<input name="newTagName" maxLength={50} placeholder="Tag name" /></label><p className="admin-field-help">Hold Command or Control to choose multiple tags.</p><button>Add tags</button></form><form action={bulkRemoveMediaFromTags} className="admin-content-form"><HiddenSelection ids={selectedIds} /><input type="hidden" name="returnTo" value={returnTo} /><label>Remove one or more tags<select name="tagIds" multiple required size={Math.min(6, Math.max(2, tags.length))}>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label><p className="admin-field-help">Only tag assignments are removed. Every Media asset remains.</p><button>Remove tags</button></form></div>
    </section>}

    {panel === "gallery" && <section className="media-bulk-panel" aria-labelledby="bulk-gallery-title">
      <div className="media-bulk-panel-heading"><div><h3 id="bulk-gallery-title">Add to Project gallery</h3><p>Selection order becomes gallery order; existing relations are skipped.</p></div><button type="button" onClick={() => setPanel(null)}>Close</button></div>
      <form action={bulkAddMediaToProjectGallery} className="admin-content-form"><HiddenSelection ids={selectedIds} /><input type="hidden" name="returnTo" value={returnTo} /><label>Project<select name="projectId" required defaultValue=""><option value="" disabled>Choose project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.status}</option>)}</select></label><button>Add {selectedIds.length} to gallery</button></form>
    </section>}

    <div className="admin-media-grid media-manage-grid">{items.map((item) => <article key={item.id} className={selectedIds.includes(item.id) ? "selected" : ""}>
      <label className="media-card-select"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => choose(item.id, (event.nativeEvent as MouseEvent).shiftKey)} /><span>Select {item.filename}</span></label>
      {item.mediaType === "IMAGE" ? <img src={item.publicUrl} alt={item.alt || item.filename} loading="lazy" /> : <video src={item.publicUrl} muted playsInline preload="metadata" />}
      <strong title={item.filename}>{item.filename}</strong><span>{item.mediaType} · {item.width && item.height ? `${item.width} × ${item.height}` : "Dimensions pending"}</span><StatusBadge value={item.mediaType} />
      <small className="media-usage-summary">{item.usage.referenceCount ? `Used in ${item.usage.referenceCount} location${item.usage.referenceCount === 1 ? "" : "s"}` : "Unused · eligible for verified cleanup"}</small>
      {item.collections.length > 0 && <div className="media-card-collections">{item.collections.map(({ collection }) => <span key={collection.id}>{collection.name}</span>)}</div>}
      {item.tags.length > 0 && <div className="media-card-tags" aria-label="Tags">{item.tags.map(({ tag }) => <span key={tag.id}>#{tag.name}</span>)}</div>}
      <details><summary>Details and metadata</summary><div className="media-detail-facts"><span>Size <b>{humanFileSize(item.fileSize ?? 0)}</b></span><span>Format <b>{item.mimeType}</b></span><span>Provider <b>{item.storageProvider}</b></span><span>Created <b>{new Date(item.createdAt).toLocaleDateString()}</b></span><span>Aspect <b>{item.aspectClass ?? classifyMediaAspect(item.width, item.height) ?? "Unknown"}</b></span><span>Exact duplicate <b>{item.contentHash ? item.duplicateCount > 1 ? `${item.duplicateCount - 1} other asset${item.duplicateCount === 2 ? "" : "s"}` : "None recorded" : "Not indexed (legacy)"}</b></span>{item.duration ? <span>Duration <b>{item.duration.toFixed(1)}s</b></span> : null}</div>{item.usage.usage.length > 0 && <div className="media-usage-detail"><strong>Usage</strong>{item.usage.usage.map((usage) => <div key={usage.label}><b>{usage.label} ({usage.count})</b>{usage.locations?.map((location) => <span key={location}>{location}</span>)}</div>)}</div>}<form action={saveMediaMetadata} className="admin-content-form"><input type="hidden" name="id" value={item.id} /><label>Alt text<input name="alt" defaultValue={item.alt ?? ""} /></label><label>Caption<textarea name="caption" defaultValue={item.caption ?? ""} rows={3} /></label>{item.mediaType === "IMAGE" && <FocalPointEditor src={item.publicUrl} alt={item.alt || item.filename} focalX={item.focalX} focalY={item.focalY} />}<button type="submit">Save metadata</button></form></details>
    </article>)}</div>

    {panel === "delete" && <div className="media-delete-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPanel(null); }}><section ref={dialogRef} className="media-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title" aria-describedby="bulk-delete-description" onKeyDown={(event) => { if (event.key !== "Tab") return; const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]') ?? [])]; if (!focusable.length) return; const first = focusable[0], last = focusable.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }}><div><h2 id="bulk-delete-title">Delete safe Media assets?</h2><p id="bulk-delete-description">{selected.length} selected. {classification.safeIds.length} can be deleted; {classification.protectedIds.length} referenced or shared asset{classification.protectedIds.length === 1 ? "" : "s"} will be skipped.</p></div>{classification.protectedIds.length > 0 && <ul>{selected.filter((item) => item.usage.referenceCount > 0).map((item) => <li key={item.id}><strong>{item.filename}</strong> — protected by {item.usage.referenceCount} usage location{item.usage.referenceCount === 1 ? "" : "s"}</li>)}</ul>}<div className="media-delete-actions"><button ref={dialogCloseRef} type="button" onClick={() => setPanel(null)}>Cancel</button><form action={deleteAction}><HiddenSelection ids={selectedIds} /><button className="admin-danger" disabled={!classification.safeIds.length || deletePending}>{deletePending ? "Deleting safely…" : `Delete ${classification.safeIds.length} safe asset${classification.safeIds.length === 1 ? "" : "s"}`}</button></form></div></section></div>}
  </div>;
}
