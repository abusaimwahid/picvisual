"use client";

export function ConfirmDeleteButton({ label }: { label: string }) {
  return <button type="submit" onClick={(event) => { if (!window.confirm(`Delete ${label}? This cannot be undone.`)) event.preventDefault(); }}>Delete</button>;
}
