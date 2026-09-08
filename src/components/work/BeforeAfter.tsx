"use client";
import { useId, useState } from "react";
import type { PublicAsset } from "@/content/work";
import { CmsImage } from "@/components/ui/CmsImage";
export function BeforeAfter({ before, after }: { before: PublicAsset; after: PublicAsset }) {
  const [position, setPosition] = useState(50); const id = useId();
  return <figure className="case-comparison"><div><CmsImage asset={after} alt={after.alt || "After post-production"} /><div className="case-comparison-before" style={{ clipPath: `inset(0 ${100-position}% 0 0)` }}><CmsImage asset={before} alt={before.alt || "Before post-production"} /></div></div><figcaption><span>Before</span><label htmlFor={id}>Compare the finish</label><span>After</span></figcaption><input id={id} type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} /></figure>;
}
