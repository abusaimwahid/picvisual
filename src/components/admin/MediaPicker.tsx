"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { UploadedMedia } from "@/lib/media/browser-upload";
import { CmsImage } from "@/components/ui/CmsImage";
import { MediaUploadQueue } from "@/components/admin/MediaUploadQueue";

export type PickerMedia = UploadedMedia;

export function MediaPicker({ name, label, items: initialItems, selectedId, selectedIds = [], accept = "ALL", multiple = false, onChange, onChangeMultiple }: { name: string; label: string; items: PickerMedia[]; selectedId?: string | null; selectedIds?: string[]; accept?: "ALL" | "IMAGE" | "VIDEO"; multiple?: boolean; onChange?: (id: string) => void; onChangeMultiple?: (ids: string[]) => void }) {
  const initialSelection = multiple ? selectedIds : selectedId ? [selectedId] : [];
  const [values, setValues] = useState<string[]>(initialSelection); const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [items, setItems] = useState(initialItems); const [nextCursor, setNextCursor] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const dialogRef = useRef<HTMLDivElement>(null); const triggerRef = useRef<HTMLButtonElement>(null); const autoSelectSingleUpload = useRef(false);
  const selected = multiple ? undefined : items.find((item) => item.id === values[0]) ?? initialItems.find((item) => item.id === values[0]); const visible = useMemo(() => items.filter((item) => accept === "ALL" || item.mediaType === accept), [accept, items]);
  const setSelections = (ids: string[]) => { setValues(ids); if (multiple) onChangeMultiple?.(ids); else onChange?.(ids[0] ?? ""); };
  const toggleSelection = (id: string) => { if (!multiple) { setSelections([id]); setOpen(false); return; } setSelections(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]); };
  const load = async (reset: boolean) => { setLoading(true); setError(""); try { const params = new URLSearchParams(); if (query) params.set("q", query); if (accept !== "ALL") params.set("type", accept); if (!reset && nextCursor) params.set("cursor", nextCursor); const response = await fetch(`/api/admin/media?${params}`); const data = await response.json() as { items?: PickerMedia[]; nextCursor?: string | null; error?: string }; if (!response.ok) throw new Error(data.error ?? "Could not load media."); setItems((current) => reset ? data.items ?? [] : [...current, ...(data.items ?? []).filter((item) => !current.some((existing) => existing.id === item.id))]); setNextCursor(data.nextCursor ?? null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load media."); } finally { setLoading(false); } };
  useEffect(() => { if (!open) return; const timeout = window.setTimeout(() => { void load(true); }, 180); return () => window.clearTimeout(timeout); }, [open, query, accept]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [open]);
  const uploaded = (item: UploadedMedia) => { setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]); if (!multiple && autoSelectSingleUpload.current) { setSelections([item.id]); setOpen(false); } };
  return <div className="media-picker">{multiple ? values.map((value) => <input key={value} type="hidden" name={name} value={value} />) : <input type="hidden" name={name} value={values[0] ?? ""} />}<span>{label}</span>{multiple ? <div className="media-picker-selected"><span>{values.length ? `${values.length} assets selected` : "None selected"}</span>{values.length > 0 && <button type="button" onClick={() => setSelections([])}>Clear</button>}</div> : selected ? <div className="media-picker-selected"><span>{selected.mediaType === "IMAGE" ? "Image" : "Video"}: {selected.filename}</span><button type="button" onClick={() => setSelections([])}>Clear</button></div> : <small>None selected</small>}<button ref={triggerRef} type="button" onClick={() => setOpen(true)}>{multiple ? "Choose media" : "Choose from media library"}</button><Link className="media-picker-upload" href="/admin/media">Open Media Library</Link>{open && <div ref={dialogRef} className="media-picker-overlay" role="dialog" aria-modal="true" aria-label={`${label} media picker`}><div className="media-picker-dialog"><div><strong>{label}{multiple ? ` · ${values.length} selected` : ""}</strong><button type="button" onClick={() => setOpen(false)}>{multiple ? "Done" : "Close"}</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search media" placeholder="Search filename, alt text, or caption" autoFocus /><MediaUploadQueue compact accept={accept} onFilesQueued={(ids) => { autoSelectSingleUpload.current = ids.length === 1; }} onComplete={uploaded} />{error && <p className="admin-notice" role="alert">{error}</p>}<div className="media-picker-grid">{visible.map((item) => <button type="button" key={item.id} className={values.includes(item.id) ? "selected" : ""} aria-pressed={values.includes(item.id)} onClick={() => toggleSelection(item.id)}>{item.mediaType === "IMAGE" && <CmsImage asset={item} sizes="160px" />}<span>{item.mediaType}</span><b>{item.filename}</b><small>{item.width && item.height ? `${item.width} × ${item.height}` : item.alt || item.caption || "No metadata"}</small></button>)}</div>{loading && <p>Loading media…</p>}{!loading && !visible.length && <p>No matching {accept.toLowerCase()} media found.</p>}{nextCursor && <button type="button" onClick={() => void load(false)} disabled={loading}>Load more</button>}</div></div>}</div>;
}
