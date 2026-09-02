"use client";

import { useFormStatus } from "react-dom";

function ActionButton({ children }: { children: React.ReactNode }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending}>{pending ? "Working…" : children}</button>; }
export function HomeSectionActions({ id, label, deletable, move, duplicate, remove }: { id: string; label: string; deletable: boolean; move: (formData: FormData) => void; duplicate: (formData: FormData) => void; remove: (formData: FormData) => void }) {
  return <div className="admin-inline-actions"><form action={move}><input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="up" /><ActionButton>Move up</ActionButton></form><form action={move}><input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="down" /><ActionButton>Move down</ActionButton></form><form action={duplicate}><input type="hidden" name="id" value={id} /><ActionButton>Duplicate</ActionButton></form>{deletable && <form action={remove} onSubmit={(event) => { if (!window.confirm(`Delete ${label} section? This cannot be undone.`)) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><ActionButton>Delete</ActionButton></form>}</div>;
}
