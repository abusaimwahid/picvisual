import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit/log";
import { requireUser, getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { createMediaFromFile } from "@/lib/media/upload";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  try {
    requirePermission(await requireUser(), "editContent");
    const { searchParams } = request.nextUrl; const query = searchParams.get("q")?.trim() ?? ""; const type = searchParams.get("type"); const cursor = searchParams.get("cursor") ?? undefined;
    const where: Prisma.MediaWhereInput = { ...(type === "IMAGE" || type === "VIDEO" ? { mediaType: type } : {}), ...(query ? { OR: [{ filename: { contains: query, mode: "insensitive" } }, { alt: { contains: query, mode: "insensitive" } }, { caption: { contains: query, mode: "insensitive" } }] } : {}) };
    const rows = await prisma.media.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: PAGE_SIZE + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, filename: true, publicUrl: true, mediaType: true, alt: true, caption: true, width: true, height: true } });
    const hasMore = rows.length > PAGE_SIZE; const items = rows.slice(0, PAGE_SIZE); return NextResponse.json({ items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null });
  } catch { return NextResponse.json({ error: "Media access is unavailable." }, { status: 403 }); }
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "editContent")) return NextResponse.json({ error: "Sign in to manage media." }, { status: 403 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) return NextResponse.json({ error: "Use direct upload for files larger than 4 MB." }, { status: 413 });
  try {
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Choose a file up to 4 MB, or use direct upload." }, { status: 400 });
    const media = await createMediaFromFile({ name: file.name, type: file.type, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()) });
    await audit(actor.id, "MEDIA_UPLOADED", "Media", media.id); return NextResponse.json({ item: { id: media.id, filename: media.filename, publicUrl: media.publicUrl, mediaType: media.mediaType, alt: media.alt, caption: media.caption, width: media.width, height: media.height } }, { status: 201 });
  } catch { return NextResponse.json({ error: "Upload failed. Check the file type, size and storage connection." }, { status: 400 }); }
}
