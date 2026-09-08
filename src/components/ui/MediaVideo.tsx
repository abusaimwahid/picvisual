"use client";
import { useEffect, useRef } from "react";
export function MediaVideo({ src, poster, className, label, decorative = false }: { src: string; poster?: string; className?: string; label?: string; decorative?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current; if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) element.pause(); }, { threshold: .05 });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} className={className} aria-label={label} controls={!decorative} muted={decorative} playsInline preload="none" />;
}
