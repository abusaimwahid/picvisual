"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { UploadedMedia } from "@/lib/media/browser-upload";
import { CmsImage } from "@/components/ui/CmsImage";
import { MediaUploadQueue } from "@/components/admin/MediaUploadQueue";

export type PickerMedia = UploadedMedia;
type Aspect = "ALL" | "LANDSCAPE" | "PORTRAIT" | "SQUARE";

function dimensions(item: PickerMedia) {
  return item.width && item.height ? `${item.width} × ${item.height}` : "Dimensions unavailable";
}

function matchesAspect(item: PickerMedia, aspect: Aspect) {
  if (aspect === "ALL" || !item.width || !item.height) return true;
  const ratio = item.width / item.height;
  if (aspect === "SQUARE") return ratio >= .95 && ratio <= 1.05;
  return aspect === "LANDSCAPE" ? ratio > 1.05 : ratio < .95;
}

function MediaThumb({ item }: { item: PickerMedia }) {
  return item.mediaType === "IMAGE" ? <CmsImage asset={item} sizes="120px" /> : <span className="media-picker-video">VIDEO</span>;
}

export function MediaPicker({ name, label, items: initialItems, selectedId, selectedIds = [], accept = "ALL", multiple = false, onChange, onChangeMultiple }: { name: string; label: string; items: PickerMedia[]; selectedId?: string | null; selectedIds?: string[]; accept?: "ALL" | "IMAGE" | "VIDEO"; multiple?: boolean; onChange?: (id: string) => void; onChangeMultiple?: (ids: string[]) => void }) {
  const initialSelection = multiple ? selectedIds : selectedId ? [selectedId] : [];
  const [values, setValues] = useState<string[]>(initialSelection);
  const [draftValues, setDraftValues] = useState<string[]>(initialSelection);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aspect, setAspect] = useState<Aspect>("ALL");
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const autoSelectSingleUpload = useRef(false);
  const selectedItems = values.map((id) => items.find((item) => item.id === id) ?? initialItems.find((item) => item.id === id)).filter((item): item is PickerMedia => Boolean(item));
  const visible = useMemo(() => items.filter((item) => (accept === "ALL" || item.mediaType === accept) && matchesAspect(item, aspect)), [accept, aspect, items]);

  const setSelections = (ids: string[]) => {
    setValues(ids);
    if (multiple) onChangeMultiple?.(ids); else onChange?.(ids[0] ?? "");
  };
  const openPicker = () => { setDraftValues(values); setOpen(true); };
  const cancel = () => setOpen(false);
  const useSelection = () => { setSelections(draftValues); setOpen(false); };
  const toggleSelection = (id: string) => {
    if (!multiple) { setSelections([id]); setOpen(false); return; }
    setDraftValues((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const load = async (reset: boolean) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (accept !== "ALL") params.set("type", accept);
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const response = await fetch(`/api/admin/media?${params}`);
      const data = await response.json() as { items?: PickerMedia[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load media.");
      setItems((current) => reset ? data.items ?? [] : [...current, ...(data.items ?? []).filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(data.nextCursor ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load media.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => { void load(true); }, 180);
    return () => window.clearTimeout(timeout);
  }, [open, query, accept]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); cancel(); }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [open]);

  const uploaded = (item: UploadedMedia) => {
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
    if (!multiple && autoSelectSingleUpload.current) { setSelections([item.id]); setOpen(false); }
  };

  return <div className="media-picker">
    {multiple ? values.map((value) => <input key={value} type="hidden" name={name} value={value} />) : <input type="hidden" name={name} value={values[0] ?? ""} />}
    <span className="media-picker-label">{label}</span>
    {selectedItems.length ? <div className={`media-picker-current ${multiple ? "is-multiple" : ""}`}>
      <div className="media-picker-current-assets">{selectedItems.slice(0, multiple ? 4 : 1).map((item) => <div className="media-picker-current-thumb" key={item.id}><MediaThumb item={item} /></div>)}{multiple && selectedItems.length > 4 && <b>+{selectedItems.length - 4}</b>}</div>
      <div className="media-picker-current-copy"><strong>{multiple ? `${selectedItems.length} assets selected` : selectedItems[0].filename}</strong><span>{multiple ? "Ordered media selection" : `${selectedItems[0].mediaType} · ${dimensions(selectedItems[0])}`}</span>{!multiple && <small>{selectedItems[0].alt || selectedItems[0].caption || "No alt text or caption"}</small>}</div>
      <div className="media-picker-current-actions"><button ref={triggerRef} type="button" onClick={openPicker}>{multiple ? "Edit selection" : "Replace"}</button><button type="button" className="admin-danger-text" onClick={() => setSelections([])}>Remove</button></div>
    </div> : <button ref={triggerRef} className="media-picker-empty" type="button" onClick={openPicker}><span aria-hidden="true">＋</span><strong>Select {accept === "VIDEO" ? "video" : accept === "IMAGE" ? "image" : "media"}</strong><small>Choose an approved asset from the library</small></button>}
    <Link className="media-picker-upload" href="/admin/media">Open full Media Library ↗</Link>

    {open && <div className="media-picker-overlay" role="presentation"><div ref={dialogRef} className="media-picker-dialog" role="dialog" aria-modal="true" aria-label={`${label} media picker`}>
      <header><div><span className="admin-kicker">MEDIA LIBRARY</span><strong>{label}</strong><small>{multiple ? `${draftValues.length} selected · click assets to change the set` : "Choose one asset"}</small></div><button type="button" onClick={cancel} aria-label="Close media picker">×</button></header>
      <div className="media-picker-toolbar"><label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filename, alt text or caption" autoFocus /></label><label><span>Aspect</span><select value={aspect} onChange={(event) => setAspect(event.target.value as Aspect)}><option value="ALL">All aspects</option><option value="LANDSCAPE">Landscape</option><option value="PORTRAIT">Portrait</option><option value="SQUARE">Square</option></select></label></div>
      <details className="media-picker-upload-panel"><summary>Upload new media</summary><MediaUploadQueue compact accept={accept} onFilesQueued={(ids) => { autoSelectSingleUpload.current = ids.length === 1; }} onComplete={uploaded} /></details>
      {error && <p className="admin-notice" role="alert">{error}</p>}
      <div className="media-picker-grid">{visible.map((item) => <button type="button" key={item.id} className={draftValues.includes(item.id) ? "selected" : ""} aria-pressed={draftValues.includes(item.id)} onClick={() => toggleSelection(item.id)}><span className="media-picker-grid-thumb"><MediaThumb item={item} /></span><span>{item.mediaType}</span><b>{item.filename}</b><small>{dimensions(item)}</small>{draftValues.includes(item.id) && <i aria-hidden="true">✓</i>}</button>)}</div>
      {loading && <p className="media-picker-loading">Loading media…</p>}
      {!loading && !visible.length && <p className="admin-empty-copy">No matching {accept.toLowerCase()} media found.</p>}
      {nextCursor && <button className="media-picker-load-more" type="button" onClick={() => void load(false)} disabled={loading}>Load more media</button>}
      <footer><button type="button" onClick={cancel}>Cancel</button>{multiple && <button className="admin-primary-action" type="button" onClick={useSelection}>Use selected media ({draftValues.length})</button>}</footer>
    </div></div>}
  </div>;
}
