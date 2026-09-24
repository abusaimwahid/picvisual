"use client";
import { useEffect, useRef } from "react";

/** Decorative = muted cinematic playback (hero / ambient). Otherwise native controls. */
export function MediaVideo({
  src, poster, className, label, decorative = false, autoPlay = false, loop = false, priority = false,
}: {
  src: string; poster?: string; className?: string; label?: string; decorative?: boolean;
  autoPlay?: boolean; loop?: boolean; priority?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const cinematic = decorative || autoPlay;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!cinematic) return;
    const play = () => { void element.play().catch(() => undefined); };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) play();
      else element.pause();
    }, { threshold: 0.08 });
    observer.observe(element);
    if (priority) play();
    return () => observer.disconnect();
  }, [cinematic, priority, src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      aria-label={label}
      controls={!cinematic}
      muted={cinematic}
      playsInline
      loop={loop || cinematic}
      autoPlay={cinematic && priority}
      preload={priority ? "auto" : "metadata"}
    />
  );
}
