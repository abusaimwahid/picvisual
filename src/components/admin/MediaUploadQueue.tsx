"use client";

/* eslint-disable @next/next/no-img-element -- blob previews are short-lived local URLs and provider thumbnails retain their native dimensions */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cancelDuplicateUpload, DuplicateMediaError, findExistingDuplicate, resolveDirectDuplicate, uploadBrowserFile, validateBrowserFile, type DuplicateMedia, type UploadedMedia, type UploadStage } from "@/lib/media/browser-upload";
import { hashBrowserBlob } from "@/lib/media/content-hash";
import { fileQueueIdentity, humanFileSize, MEDIA_UPLOAD_CONCURRENCY, nextQueuedIds, overallUploadProgress, reserveBatchContentHash, uploadSummary, type UploadStatus } from "@/lib/media/upload-queue";

type DuplicateConflict = { existing?: DuplicateMedia; batchQueueId?: string; ticket?: string };

type QueueItem = {
  id: string;
  identity: string;
  file: File;
  filename: string;
  mediaType: "IMAGE" | "VIDEO" | "UNKNOWN";
  size: number;
  status: UploadStatus;
  uploadedBytes: number;
  previewUrl?: string;
  error?: string;
  media?: UploadedMedia;
  startedAt?: number;
  durationMs?: number;
  contentHash?: string;
  allowDuplicate?: boolean;
  duplicate?: DuplicateConflict;
};

type MediaUploadQueueProps = {
  accept?: "ALL" | "IMAGE" | "VIDEO";
  compact?: boolean;
  onComplete?: (item: UploadedMedia, queueId: string) => void;
  onFilesQueued?: (queueIds: string[]) => void;
};

const stageStatus: Record<UploadStage, UploadStatus> = { VALIDATING: "VALIDATING", UPLOADING: "UPLOADING", FINALIZING: "FINALIZING" };
const activeStatuses = new Set<UploadStatus>(["QUEUED", "VALIDATING", "UPLOADING", "FINALIZING"]);

function statusLabel(item: QueueItem) {
  if (item.status === "UPLOADING") return `Uploading ${Math.round((item.uploadedBytes / Math.max(1, item.size)) * 100)}%`;
  if (item.status === "FINALIZING") return "Finalizing…";
  if (item.status === "COMPLETE" && item.durationMs) {
    const megabytesPerSecond = item.size / 1024 / 1024 / Math.max(item.durationMs / 1000, 0.001);
    return `Complete · ${(item.durationMs / 1000).toFixed(1)}s · ${megabytesPerSecond.toFixed(1)} MB/s`;
  }
  if (item.status === "COMPLETE") return "Complete";
  if (item.status === "DUPLICATE") return "DUPLICATE — choose Use Existing, Upload Anyway, or Remove.";
  if (item.status === "FAILED") return item.error || "Upload failed.";
  return item.status.charAt(0) + item.status.slice(1).toLowerCase();
}

export function MediaUploadQueue({ accept = "ALL", compact = false, onComplete, onFilesQueued }: MediaUploadQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  const activeIds = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());
  const progressPaint = useRef(new Map<string, number>());
  const previewUrls = useRef(new Set<string>());
  const hashOwners = useRef(new Map<string, string>());
  const completeHandler = useRef(onComplete);
  const queuedHandler = useRef(onFilesQueued);
  itemsRef.current = items;
  completeHandler.current = onComplete;
  queuedHandler.current = onFilesQueued;

  const updateItem = useCallback((id: string, change: Partial<QueueItem> | ((item: QueueItem) => Partial<QueueItem>)) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...(typeof change === "function" ? change(item) : change) } : item));
  }, []);

  const releasePreview = useCallback((url?: string) => {
    if (!url || !previewUrls.current.has(url)) return;
    URL.revokeObjectURL(url); previewUrls.current.delete(url);
  }, []);

  const runItem = useCallback(async (item: QueueItem) => {
    const controller = new AbortController(); controllers.current.set(item.id, controller);
    const startedAt = performance.now(); updateItem(item.id, { status: "VALIDATING", startedAt });
    try {
      const media = await uploadBrowserFile(item.file, {
        signal: controller.signal,
        contentHash: item.contentHash,
        allowDuplicate: item.allowDuplicate,
        onStage: (stage) => updateItem(item.id, { status: stageStatus[stage] }),
        onProgress: (uploadedBytes) => {
          const now = performance.now(), last = progressPaint.current.get(item.id) ?? 0;
          if (uploadedBytes < item.size && now - last < 100) return;
          progressPaint.current.set(item.id, now); updateItem(item.id, { uploadedBytes: Math.min(item.size, uploadedBytes) });
        },
      });
      releasePreview(item.previewUrl);
      updateItem(item.id, { status: "COMPLETE", uploadedBytes: item.size, media, previewUrl: undefined, durationMs: performance.now() - startedAt });
      completeHandler.current?.(media, item.id);
    } catch (reason) {
      if (reason instanceof DuplicateMediaError) {
        updateItem(item.id, { status: "DUPLICATE", uploadedBytes: item.size, duplicate: { existing: reason.duplicate, ticket: reason.ticket }, error: undefined });
        return;
      }
      const canceled = controller.signal.aborted || (reason instanceof DOMException && reason.name === "AbortError");
      if (canceled) releasePreview(item.previewUrl);
      updateItem(item.id, { status: canceled ? "CANCELED" : "FAILED", previewUrl: canceled ? undefined : item.previewUrl, error: canceled ? undefined : reason instanceof Error ? reason.message : "Upload failed. Retry this file." });
    } finally {
      controllers.current.delete(item.id); progressPaint.current.delete(item.id); activeIds.current.delete(item.id);
      setItems((current) => [...current]);
    }
  }, [releasePreview, updateItem]);

  useEffect(() => {
    for (const id of nextQueuedIds(items, activeIds.current, MEDIA_UPLOAD_CONCURRENCY)) {
      const item = items.find((candidate) => candidate.id === id); if (!item) continue;
      activeIds.current.add(id); void runItem(item);
    }
  }, [items, runItem]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (itemsRef.current.some((item) => activeStatuses.has(item.status))) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => () => {
    controllers.current.forEach((controller) => controller.abort());
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const candidates: QueueItem[] = [];
    for (const file of Array.from(fileList)) {
      const identity = fileQueueIdentity(file);
      candidates.push({ id: crypto.randomUUID(), identity, file, filename: file.name, mediaType: file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : "UNKNOWN", size: file.size, status: "VALIDATING", uploadedBytes: 0 });
    }
    if (!candidates.length) return;
    queuedHandler.current?.(candidates.map((item) => item.id));
    setCollapsed(false); setItems((current) => [...current, ...candidates]);
    for (const item of candidates) void validateBrowserFile(item.file).then(async (validated) => {
      if (accept !== "ALL" && validated.mediaType !== accept) throw new Error(`This uploader accepts ${accept.toLowerCase()} media only.`);
      if (itemsRef.current.find((candidate) => candidate.id === item.id)?.status !== "VALIDATING") return;
      const previewUrl = validated.mediaType === "IMAGE" ? URL.createObjectURL(item.file) : undefined;
      if (previewUrl) previewUrls.current.add(previewUrl);
      const contentHash = await hashBrowserBlob(item.file);
      if (itemsRef.current.find((candidate) => candidate.id === item.id)?.status !== "VALIDATING") { releasePreview(previewUrl); return; }
      if (contentHash) {
        const { duplicateOf: batchQueueId } = reserveBatchContentHash(hashOwners.current, contentHash, item.id);
        if (batchQueueId) {
          setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.status === "VALIDATING" ? { ...candidate, status: "DUPLICATE", mediaType: validated.mediaType, previewUrl, contentHash, duplicate: { batchQueueId } } : candidate));
          return;
        }
        const existing = await findExistingDuplicate(contentHash);
        if (itemsRef.current.find((candidate) => candidate.id === item.id)?.status !== "VALIDATING") { releasePreview(previewUrl); return; }
        if (existing) {
          setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.status === "VALIDATING" ? { ...candidate, status: "DUPLICATE", mediaType: validated.mediaType, previewUrl, contentHash, duplicate: { existing } } : candidate));
          return;
        }
      }
      setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.status === "VALIDATING" ? { ...candidate, status: "QUEUED", mediaType: validated.mediaType, previewUrl, ...(contentHash ? { contentHash } : {}) } : candidate));
    }).catch((reason) => setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.status === "VALIDATING" ? { ...candidate, status: "FAILED", error: reason instanceof Error ? reason.message : "Unsupported file type." } : candidate)));
    if (inputRef.current) inputRef.current.value = "";
  }, [accept, releasePreview]);

  const cancel = (item: QueueItem) => {
    const controller = controllers.current.get(item.id);
    if (controller) controller.abort();
    else { releasePreview(item.previewUrl); if (item.contentHash && hashOwners.current.get(item.contentHash) === item.id) hashOwners.current.delete(item.contentHash); updateItem(item.id, { status: "CANCELED", uploadedBytes: 0, previewUrl: undefined }); }
  };
  const remove = (item: QueueItem) => { releasePreview(item.previewUrl); if (item.contentHash && hashOwners.current.get(item.contentHash) === item.id) hashOwners.current.delete(item.contentHash); setItems((current) => current.filter((candidate) => candidate.id !== item.id)); };
  const retry = (id: string) => updateItem(id, { status: "QUEUED", uploadedBytes: 0, error: undefined, durationMs: undefined });
  const clearCompleted = () => setItems((current) => { current.filter((item) => item.status === "COMPLETE" && item.contentHash && hashOwners.current.get(item.contentHash) === item.id).forEach((item) => hashOwners.current.delete(item.contentHash!)); return current.filter((item) => item.status !== "COMPLETE"); });
  const retryFailed = () => setItems((current) => current.map((item) => item.status === "FAILED" ? { ...item, status: "QUEUED", uploadedBytes: 0, error: undefined } : item));

  const completeWith = (item: QueueItem, media: UploadedMedia) => {
    releasePreview(item.previewUrl);
    updateItem(item.id, { status: "COMPLETE", uploadedBytes: item.size, media, previewUrl: undefined, duplicate: undefined, error: undefined });
    completeHandler.current?.(media, item.id);
  };
  const chooseExisting = async (item: QueueItem) => {
    const source = item.duplicate?.batchQueueId ? itemsRef.current.find((candidate) => candidate.id === item.duplicate?.batchQueueId) : undefined;
    const existing = item.duplicate?.existing ?? source?.media ?? source?.duplicate?.existing;
    if (!existing) return;
    try {
      updateItem(item.id, { status: "FINALIZING", error: undefined });
      const media = item.duplicate?.ticket ? await resolveDirectDuplicate(item.duplicate.ticket, "USE_EXISTING", existing.id) : existing;
      completeWith(item, media);
    } catch (reason) { updateItem(item.id, { status: "DUPLICATE", error: reason instanceof Error ? reason.message : "Could not reuse the existing asset." }); }
  };
  const uploadAnyway = async (item: QueueItem) => {
    if (!item.duplicate?.ticket) { updateItem(item.id, { status: "QUEUED", uploadedBytes: 0, allowDuplicate: true, duplicate: undefined, error: undefined }); return; }
    try {
      updateItem(item.id, { status: "FINALIZING", error: undefined });
      const media = await resolveDirectDuplicate(item.duplicate.ticket, "UPLOAD_ANYWAY", item.duplicate.existing?.id ?? "");
      completeWith(item, media);
    } catch (reason) { updateItem(item.id, { status: "DUPLICATE", error: reason instanceof Error ? reason.message : "Could not upload the duplicate asset." }); }
  };
  const removeDuplicate = async (item: QueueItem) => {
    if (item.duplicate?.ticket) await cancelDuplicateUpload(item.duplicate.ticket).catch(() => undefined);
    remove(item);
  };

  const progress = useMemo(() => overallUploadProgress(items), [items]);
  const summary = useMemo(() => uploadSummary(items), [items]);
  const acceptValue = accept === "IMAGE" ? "image/jpeg,image/png,image/webp,image/avif,image/svg+xml" : accept === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm";

  return <section className={`media-upload-queue${compact ? " compact" : ""}`} aria-label="Upload media">
    <div className="media-upload-heading"><div><h2>Upload media</h2><p>Choose or drop images and videos. Up to three files upload at once.</p></div>{items.length > 0 && <button type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? `Uploads ${progress.percent}%${summary.failed ? ` · ${summary.failed} failed` : ""}` : "Collapse"}</button>}</div>
    {!collapsed && <>
      <div className={`media-upload-dropzone${dragging ? " dragging" : ""}`} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
        <strong>{dragging ? "Drop files to add them" : "Drag images or videos here"}</strong><span>or</span><button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Choose files</button>
        <input ref={inputRef} aria-label="Choose media files" type="file" accept={acceptValue} multiple onChange={(event) => event.currentTarget.files && addFiles(event.currentTarget.files)} onClick={(event) => event.stopPropagation()} />
      </div>
      <small className="media-upload-help">Raster images and video upload directly to Cloudinary. SVG stays on the secure validation path (4 MB maximum). Other files may be up to 200 MB.</small>
      {items.length > 0 && <div className="media-upload-summary">
        <div aria-live="polite"><strong>{summary.total} file{summary.total === 1 ? "" : "s"} · {humanFileSize(progress.totalBytes)}</strong><span>{summary.complete} complete · {summary.uploading} uploading · {summary.queued} queued{summary.duplicate ? ` · ${summary.duplicate} duplicate conflict${summary.duplicate === 1 ? "" : "s"}` : ""}{summary.failed ? ` · ${summary.failed} failed` : ""}{summary.canceled ? ` · ${summary.canceled} canceled` : ""}</span></div>
        <div><label htmlFor="media-overall-progress">Overall <b>{progress.percent}%</b></label><progress id="media-overall-progress" max={progress.totalBytes || 1} value={progress.uploadedBytes} /></div>
      </div>}
      {items.length > 0 && <div className="media-upload-list">{items.map((item) => <article key={item.id} data-status={item.status}>
        <div className="media-upload-preview">{item.previewUrl ? <img src={item.previewUrl} alt="" /> : item.media?.mediaType === "IMAGE" ? <img src={item.media.publicUrl} alt="" /> : <span>{item.mediaType === "VIDEO" ? "VIDEO" : item.mediaType === "IMAGE" ? "IMAGE" : "FILE"}</span>}</div>
        <div className="media-upload-file"><strong>{item.filename}</strong><small>{humanFileSize(item.size)} · {item.mediaType.toLowerCase()}</small><span className={item.status === "FAILED" ? "error" : ""}>{statusLabel(item)}</span>{item.status === "DUPLICATE" && <div className="media-duplicate-detail"><b>Duplicate media detected.</b>{item.duplicate?.existing ? <><span>Existing: {item.duplicate.existing.filename}</span><span>Created {new Date(item.duplicate.existing.createdAt).toLocaleDateString()} · {item.duplicate.existing.usageCount ? `used in ${item.duplicate.existing.usageCount} location${item.duplicate.existing.usageCount === 1 ? "" : "s"}` : "currently unused"}</span></> : <span>Exact content already exists in this active batch.</span>}{item.error && <span className="error">{item.error}</span>}</div>}{(item.status === "UPLOADING" || item.status === "FINALIZING") && <progress aria-label={`${item.filename} upload progress`} max={item.size || 1} value={item.status === "FINALIZING" ? item.size : item.uploadedBytes} />}</div>
        <div className="media-upload-actions">{activeStatuses.has(item.status) && <button type="button" onClick={() => cancel(item)}>Cancel</button>}{item.status === "DUPLICATE" && <><button type="button" disabled={!item.duplicate?.existing && !items.find((candidate) => candidate.id === item.duplicate?.batchQueueId)?.media && !items.find((candidate) => candidate.id === item.duplicate?.batchQueueId)?.duplicate?.existing} onClick={() => void chooseExisting(item)}>Use Existing</button><button type="button" onClick={() => void uploadAnyway(item)}>Upload Anyway</button><button type="button" onClick={() => void removeDuplicate(item)}>Remove</button></>}{item.status === "FAILED" && <button type="button" onClick={() => retry(item.id)}>Retry</button>}{item.status === "CANCELED" && <button type="button" onClick={() => remove(item)}>Remove</button>}</div>
      </article>)}</div>}
      {(summary.complete > 0 || summary.failed > 0) && <div className="media-upload-batch-actions">{summary.failed > 0 && <button type="button" onClick={retryFailed}>Retry failed</button>}{summary.complete > 0 && <button type="button" onClick={clearCompleted}>Clear completed</button>}</div>}
    </>}
  </section>;
}
