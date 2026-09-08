"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadBrowserFile } from "@/lib/media/browser-upload";
import { supportedMediaAccept } from "@/lib/media/validation";
export function MediaUploadForm() {
  const [pending,setPending]=useState(false), [error,setError]=useState(""); const router=useRouter();
  return <form className="admin-card admin-content-form" onSubmit={async(event)=>{event.preventDefault(); const file = new FormData(event.currentTarget).get("file"); if (!(file instanceof File) || pending) return; setPending(true);setError(""); try { await uploadBrowserFile(file);router.push("/admin/media?success=uploaded");router.refresh(); } catch(e){setError(e instanceof Error?e.message:"Upload failed.");} finally{setPending(false);} }}><h2>Upload media</h2><label>Image or video<input name="file" type="file" accept={supportedMediaAccept} required disabled={pending} /></label><small>Up to 200 MB. SVG up to 2 MB. Landscape heroes and matching before/after crops are recommended; portrait and 9:16 media are supported.</small><button disabled={pending}>{pending?"Uploading and verifying…":"Upload media"}</button>{error&&<p role="alert">{error}</p>}</form>;
}
