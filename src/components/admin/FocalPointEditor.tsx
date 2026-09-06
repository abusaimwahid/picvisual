"use client";
/* eslint-disable @next/next/no-img-element -- provider URLs are selected at runtime. */

import { useState } from "react";

export function FocalPointEditor({ src, alt, focalX = 50, focalY = 50 }: { src: string; alt: string; focalX?: number | null; focalY?: number | null }) {
  const [point, setPoint] = useState({ x: focalX ?? 50, y: focalY ?? 50 });
  const update = (event: React.PointerEvent<HTMLButtonElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); setPoint({ x: Math.round(((event.clientX - bounds.left) / bounds.width) * 100), y: Math.round(((event.clientY - bounds.top) / bounds.height) * 100) }); };
  return <div className="media-focal-editor"><input type="hidden" name="focalX" value={point.x} /><input type="hidden" name="focalY" value={point.y} /><button type="button" className="media-focal-preview" onPointerDown={update} aria-label="Set focal point"><img src={src} alt={alt} /><i style={{ left: `${point.x}%`, top: `${point.y}%` }} /></button><div><small>Click the preview to set focal point: {point.x}% × {point.y}%</small><button type="button" onClick={() => setPoint({ x: 50, y: 50 })}>Center</button></div></div>;
}
