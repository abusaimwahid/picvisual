"use client";

import { useEffect, useRef, useState } from "react";

export function EditorStateIndicator({ initialState }: { initialState: "SAVED DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"UNSAVED CHANGES" | "SAVED DRAFT" | "PUBLISHED" | "ARCHIVED">(initialState);
  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    const dirty = () => setState("UNSAVED CHANGES");
    form.addEventListener("input", dirty);
    form.addEventListener("change", dirty);
    return () => { form.removeEventListener("input", dirty); form.removeEventListener("change", dirty); };
  }, []);
  return <span ref={marker} className={`admin-editor-state state-${state.toLowerCase().replaceAll(" ", "-")}`} role="status" aria-live="polite">{state}</span>;
}
