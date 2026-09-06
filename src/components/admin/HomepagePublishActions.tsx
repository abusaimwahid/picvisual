"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

function Submit({ children, className }: { children: React.ReactNode; className?: string }) { const { pending } = useFormStatus(); return <button className={className} type="submit" disabled={pending}>{pending ? "Working…" : children}</button>; }

export function HomepagePublishActions({ publish }: { publish: () => Promise<void> }) {
  return <div className="admin-home-publish-actions"><Link href="/admin/homepage/preview" target="_blank">Preview draft ↗</Link><form action={publish} onSubmit={(event) => { if (!window.confirm("Publish homepage changes? This will update the public website.")) event.preventDefault(); }}><Submit className="admin-publish-button">Publish</Submit></form></div>;
}
