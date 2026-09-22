"use client";
import { useRouter } from "next/navigation";
import { MediaUploadQueue } from "@/components/admin/MediaUploadQueue";
export function MediaUploadForm() {
  const router=useRouter();
  return <div className="admin-card" id="media-upload"><MediaUploadQueue onComplete={() => router.refresh()} /></div>;
}
