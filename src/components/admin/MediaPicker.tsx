"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type PickerMedia = { id: string; filename: string; publicUrl: string; mediaType: "IMAGE" | "VIDEO"; alt: string | null };

export function MediaPicker({ name, label, items, selectedId, accept = "ALL", onChange }: { name: string; label: string; items: PickerMedia[]; selectedId?: string | null; accept?: "ALL" | "IMAGE" | "VIDEO"; onChange?: (id: string) => void }) {
  const [value, setValue] = useState(selectedId ?? ""); const [open, setOpen] = useState(false); const [query, setQuery] = useState("");
  const selected = items.find((item) => item.id === value); const visible = useMemo(() => items.filter((item) => (accept === "ALL" || item.mediaType === accept) && `${item.filename} ${item.alt ?? ""}`.toLowerCase().includes(query.toLowerCase())), [accept, items, query]);
  const setSelection = (id: string) => { setValue(id); onChange?.(id); };
  return <div className="media-picker"><input type="hidden" name={name} value={value} /><span>{label}</span>{selected ? <div className="media-picker-selected"><span>{selected.mediaType === "IMAGE" ? "Image" : "Video"}: {selected.filename}</span><button type="button" onClick={() => setSelection("")}>Clear</button></div> : <small>No asset selected</small>}<button type="button" onClick={() => setOpen(true)}>Choose from media library</button><Link className="media-picker-upload" href="/admin/media">Upload Media</Link>{open && <div className="media-picker-overlay" role="dialog" aria-modal="true" aria-label={`${label} media picker`}><div className="media-picker-dialog"><div><strong>{label}</strong><button type="button" onClick={() => setOpen(false)}>Close</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename or alt text" autoFocus /><div className="media-picker-grid">{visible.map((item) => <button type="button" key={item.id} className={item.id === value ? "selected" : ""} onClick={() => { setSelection(item.id); setOpen(false); }}><span>{item.mediaType}</span><b>{item.filename}</b></button>)}</div>{!visible.length && <p>No matching {accept.toLowerCase()} media found.</p>}</div></div>}</div>;
}
