import Link from "next/link";
import { createMediaCollection, createMediaTag, deleteMediaCollection, deleteMediaTag, renameMediaTag } from "@/app/admin/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { EmptyState, PageHeader } from "@/components/admin/AdminPrimitives";
import { MediaLibraryManager, type ManagedMedia } from "@/components/admin/MediaLibraryManager";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { buildMediaWhere, MEDIA_PAGE_SIZES, mediaSortOrder, normalizeMediaPageSize, type MediaAspectFilter, type MediaSort, type MediaTypeFilter, type MediaUsageFilter } from "@/lib/media/management";
import { findSerializedMediaReferenceIds, getMediaUsageBatch } from "@/lib/media/usage";

type SearchParams = { q?: string; type?: string; usage?: string; collection?: string; tag?: string; aspect?: string; sort?: string; size?: string; page?: string; success?: string; error?: string; deleted?: string; protected?: string; failed?: string; added?: string; skipped?: string; removed?: string; preserved?: string; updated?: string };

function feedback(params: SearchParams) {
  if (params.error) return `Could not complete the action: ${params.error.replaceAll("-", " ")}.`;
  if (params.success === "bulk-delete-complete") return `${params.deleted ?? 0} media deleted. ${params.protected ?? 0} protected assets skipped. ${params.failed ?? 0} provider deletions failed.`;
  if (params.success === "collection-media-added") return `${params.added ?? 0} media added to the collection. ${params.skipped ?? 0} existing memberships skipped.`;
  if (params.success === "collection-media-removed") return `${params.removed ?? 0} memberships removed. ${params.preserved ?? 0} Media assets preserved.`;
  if (params.success === "collection-deleted") return `Collection deleted. ${params.preserved ?? 0} Media assets preserved.`;
  if (params.success === "gallery-media-added") return `${params.added ?? 0} media added to the gallery. ${params.skipped ?? 0} duplicates skipped.`;
  if (params.success === "bulk-metadata-saved") return `${params.updated ?? 0} metadata records updated.`;
  if (params.success === "tag-media-added") return `${params.added ?? 0} tag assignments added. Duplicate assignments were skipped.`;
  if (params.success === "tag-media-removed") return `${params.removed ?? 0} tag assignments removed. ${params.preserved ?? 0} Media assets preserved.`;
  if (params.success === "tag-deleted") return `Tag deleted. ${params.preserved ?? 0} Media assets preserved.`;
  return params.success ? `Saved: ${params.success.replaceAll("-", " ")}.` : "";
}

export default async function MediaAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="ASSET LIBRARY" title="Media" description="Media uses the configured Cloudinary provider; uploads are never simulated." /><EmptyState title="Database not configured" description="Set DATABASE_URL and Cloudinary credentials before uploading approved assets." /></section>;
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 160) ?? "";
  const type: MediaTypeFilter = params.type === "IMAGE" || params.type === "VIDEO" || params.type === "SVG" ? params.type : "ALL";
  const usage: MediaUsageFilter = params.usage === "USED" || params.usage === "UNUSED" ? params.usage : "ALL";
  const aspect: MediaAspectFilter = params.aspect === "LANDSCAPE" || params.aspect === "PORTRAIT" || params.aspect === "SQUARE" ? params.aspect : "ALL";
  const sort: MediaSort = ["oldest", "name-asc", "name-desc", "largest", "smallest"].includes(params.sort ?? "") ? params.sort as MediaSort : "newest";
  const pageSize = normalizeMediaPageSize(params.size);
  const page = Math.max(1, Number(params.page) || 1);
  const serializedIds = usage === "ALL" ? [] : await findSerializedMediaReferenceIds();
  const where = buildMediaWhere({ query, type, usage, collectionId: params.collection, tagId: params.tag, aspect, serializedIds });
  const [media, total, collections, tags, projects] = await Promise.all([
    prisma.media.findMany({ where, orderBy: mediaSortOrder(sort), take: pageSize, skip: (page - 1) * pageSize, include: { collections: { select: { collection: { select: { id: true, name: true } } }, orderBy: { collection: { name: "asc" } } }, tags: { select: { tag: { select: { id: true, name: true } } }, orderBy: { tag: { name: "asc" } } } } }),
    prisma.media.count({ where }),
    prisma.mediaCollection.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { media: true } } } }),
    prisma.mediaTag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { media: true } } } }),
    prisma.project.findMany({ orderBy: [{ updatedAt: "desc" }], take: 200, select: { id: true, title: true, status: true } }),
  ]);
  const hashes = [...new Set(media.map((item) => item.contentHash).filter((value): value is string => Boolean(value)))];
  const [usageMap, hashCounts] = await Promise.all([
    getMediaUsageBatch(media.map((item) => item.id)),
    hashes.length ? prisma.media.groupBy({ by: ["contentHash"], where: { contentHash: { in: hashes } }, _count: { _all: true } }) : [],
  ]);
  const duplicateCounts = new Map(hashCounts.map((item) => [item.contentHash, item._count._all]));
  const items: ManagedMedia[] = media.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), duplicateCount: item.contentHash ? duplicateCounts.get(item.contentHash) ?? 1 : 0, usage: { referenceCount: usageMap.get(item.id)?.referenceCount ?? 0, usage: usageMap.get(item.id)?.usage ?? [] } }));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const state = { ...(query ? { q: query } : {}), ...(type !== "ALL" ? { type } : {}), ...(usage !== "ALL" ? { usage } : {}), ...(params.collection ? { collection: params.collection } : {}), ...(params.tag ? { tag: params.tag } : {}), ...(aspect !== "ALL" ? { aspect } : {}), ...(sort !== "newest" ? { sort } : {}), ...(pageSize !== 24 ? { size: String(pageSize) } : {}) };
  const href = (nextPage: number) => `/admin/media?${new URLSearchParams({ ...state, page: String(nextPage) })}`;
  const returnTo = `/admin/media?${new URLSearchParams({ ...state, page: String(page) })}`;
  const hasActiveFilters = Boolean(query || type !== "ALL" || usage !== "ALL" || params.collection || params.tag || aspect !== "ALL");
  const storageReady = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const message = feedback(params);

  return <section className="admin-content">
    <PageHeader eyebrow="ASSET LIBRARY" title="Media" description="Upload, organize, search, edit, reuse, and safely clean high-volume media without duplicating provider assets." />
    {!storageReady && <p className="admin-notice">Media storage is not configured. Set Cloudinary credentials to enable uploads.</p>}
    {message && <p className="admin-feedback" role={params.error ? "alert" : "status"}>{message}</p>}
    <div className="admin-editor-grid media-library-layout">
      <div className="media-library-side"><MediaUploadForm /><section className="admin-card media-collections-admin"><div><h2>Collections</h2><p>Curated groups for projects or campaigns. Deleting one preserves every Media asset.</p></div><form action={createMediaCollection} className="admin-content-form"><input type="hidden" name="returnTo" value={returnTo} /><label>New collection<input name="name" minLength={2} maxLength={80} required /></label><button>Create collection</button></form>{collections.length ? <div>{collections.map((collection) => <form key={collection.id} action={deleteMediaCollection}><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="collectionId" value={collection.id} /><span><strong>{collection.name}</strong><small>{collection._count.media} asset{collection._count.media === 1 ? "" : "s"}</small></span><ConfirmActionButton action={deleteMediaCollection} message={`Delete the ${collection.name} collection? Its ${collection._count.media} Media assets will remain in the library.`}>Delete collection</ConfirmActionButton></form>)}</div> : <p className="admin-empty-copy">No collections yet.</p>}</section><section className="admin-card media-tags-admin"><div><h2>Tags</h2><p>Reusable descriptive labels. Deleting a tag removes assignments only.</p></div><form action={createMediaTag} className="admin-content-form"><input type="hidden" name="returnTo" value={returnTo} /><label>New tag<input name="name" minLength={2} maxLength={50} required /></label><button>Create tag</button></form>{tags.length ? <div>{tags.map((tag) => <form key={tag.id} action={renameMediaTag}><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="tagId" value={tag.id} /><label><span className="sr-only">Rename {tag.name}</span><input name="name" defaultValue={tag.name} minLength={2} maxLength={50} required /></label><small>{tag._count.media} asset{tag._count.media === 1 ? "" : "s"}</small><button type="submit">Rename</button><ConfirmActionButton action={deleteMediaTag} message={`Delete the ${tag.name} tag? Its ${tag._count.media} Media assets will remain in the library.`}>Delete</ConfirmActionButton></form>)}</div> : <p className="admin-empty-copy">No tags yet.</p>}</section></div>
      <div className="admin-card media-library-main">
        <form action="/admin/media" className="admin-media-search media-filter-grid">
          <label>Search<input name="q" defaultValue={query} placeholder="Filename, alt, caption, collection, tag" /></label>
          <label>Type<select name="type" defaultValue={type}><option value="ALL">All types</option><option value="IMAGE">Images</option><option value="VIDEO">Videos</option><option value="SVG">SVG</option></select></label>
          <label>Usage<select name="usage" defaultValue={usage}><option value="ALL">All usage</option><option value="USED">Used</option><option value="UNUSED">Unused</option></select></label>
          <label>Collection<select name="collection" defaultValue={params.collection ?? ""}><option value="">All collections</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
          <label>Tag<select name="tag" defaultValue={params.tag ?? ""}><option value="">All tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>
          <label>Aspect<select name="aspect" defaultValue={aspect}><option value="ALL">All aspects</option><option value="LANDSCAPE">Landscape</option><option value="PORTRAIT">Portrait</option><option value="SQUARE">Square</option></select></label>
          <label>Sort<select name="sort" defaultValue={sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="largest">Largest</option><option value="smallest">Smallest</option></select></label>
          <label>Per page<select name="size" defaultValue={String(pageSize)}>{MEDIA_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <button type="submit">Apply filters</button><Link href="/admin/media">Reset</Link>
        </form>
        <div className="media-library-heading"><h2>Media library · {total}</h2><span>Page {Math.min(page, totalPages)} of {totalPages}</span></div>
        {media.length ? <MediaLibraryManager items={items} collections={collections.map((collection) => ({ id: collection.id, name: collection.name, count: collection._count.media }))} tags={tags.map((tag) => ({ id: tag.id, name: tag.name, count: tag._count.media }))} projects={projects} returnTo={returnTo} selectionScope={returnTo} /> : hasActiveFilters ? <div><EmptyState title={usage === "UNUSED" ? "No unused media" : params.collection ? "This collection is empty" : params.tag ? "No media has this tag" : "No media matches these filters"} description="Adjust or reset filters to return to the full Media Library." /><Link href="/admin/media">Reset all filters</Link></div> : <div className="media-library-empty"><EmptyState title="Your Media Library is ready" description="Upload the first approved image, video, or SVG when real project content is ready. Nothing is published automatically." /><a className="button" href="#media-upload">Upload Media</a><p>Drag and drop is available above. Raster images and videos use the signed upload queue; SVG files stay on the secure server validation path.</p></div>}
        {totalPages > 1 && <nav className="admin-pagination" aria-label="Media pages">{page > 1 && <Link href={href(page - 1)}>Previous</Link>}<span>Page {Math.min(page, totalPages)} of {totalPages}</span>{page < totalPages && <Link href={href(page + 1)}>Next</Link>}</nav>}
      </div>
    </div>
  </section>;
}
