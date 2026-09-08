"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { uploadBrowserFile } from "@/lib/media/browser-upload";
import { CmsImage } from "@/components/ui/CmsImage";
import { supportedMediaAccept } from "@/lib/media/validation";

export type PickerMedia = { id: string; filename: string; publicUrl: string; mediaType: "IMAGE" | "VIDEO"; alt: string | null; caption?: string | null; width?: number | null; height?: number | null };

export function MediaPicker({ name, label, items: initialItems, selectedId, accept = "ALL", onChange }: { name: string; label: string; items: PickerMedia[]; selectedId?: string | null; accept?: "ALL" | "IMAGE" | "VIDEO"; onChange?: (id: string) => void }) {
  const [value, setValue] = useState(selectedId ?? ""); const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [items, setItems] = useState(initialItems); const [nextCursor, setNextCursor] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState(""); const fileInput = useRef<HTMLInputElement>(null); const dialogRef = useRef<HTMLDivElement>(null); const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = items.find((item) => item.id === value) ?? initialItems.find((item) => item.id === value); const visible = useMemo(() => items.filter((item) => accept === "ALL" || item.mediaType === accept), [accept, items]);
  const setSelection = (id: string) => { setValue(id); onChange?.(id); };
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
  const upload = async () => { const file = fileInput.current?.files?.[0]; if (!file) return; setUploading(true); setError(""); try { const data = { item: await uploadBrowserFile(file) }; if (accept !== "ALL" && data.item.mediaType !== accept) throw new Error(`This field accepts ${accept.toLowerCase()} media only.`); setItems((current) => [data.item!, ...current.filter((item) => item.id !== data.item!.id)]); setSelection(data.item.id); setOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed."); } finally { setUploading(false); } };
  return <div className="media-picker"><input type="hidden" name={name} value={value} /><span>{label}</span>{selected ? <div className="media-picker-selected"><span>{selected.mediaType === "IMAGE" ? "Image" : "Video"}: {selected.filename}</span><button type="button" onClick={() => setSelection("")}>Clear</button></div> : <small>No asset selected</small>}<button ref={triggerRef} type="button" onClick={() => setOpen(true)}>Choose from media library</button><Link className="media-picker-upload" href="/admin/media">Open Media Library</Link>{open && <div ref={dialogRef} className="media-picker-overlay" role="dialog" aria-modal="true" aria-label={`${label} media picker`}><div className="media-picker-dialog"><div><strong>{label}</strong><button type="button" onClick={() => setOpen(false)}>Close</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search media" placeholder="Search filename, alt text, or caption" autoFocus /><div className="media-picker-upload-inline"><input aria-label="Upload media file" ref={fileInput} type="file" accept={accept === "IMAGE" ? "image/jpeg,image/png,image/webp,image/avif,image/svg+xml" : accept === "VIDEO" ? "video/mp4,video/webm" : supportedMediaAccept} /><button type="button" onClick={upload} disabled={uploading}>{uploading ? "Uploading…" : "Upload and select"}</button></div>{error && <p className="admin-notice" role="alert">{error}</p>}<div className="media-picker-grid">{visible.map((item) => <button type="button" key={item.id} className={item.id === value ? "selected" : ""} onClick={() => { setSelection(item.id); setOpen(false); }}>{item.mediaType === "IMAGE" && <CmsImage asset={item} sizes="160px" />}<span>{item.mediaType}</span><b>{item.filename}</b><small>{item.width && item.height ? `${item.width} × ${item.height}` : item.alt || item.caption || "No metadata"}</small></button>)}</div>{loading && <p>Loading media…</p>}{!loading && !visible.length && <p>No matching {accept.toLowerCase()} media found.</p>}{nextCursor && <button type="button" onClick={() => void load(false)} disabled={loading}>Load more</button>}</div></div>}</div>;
}
