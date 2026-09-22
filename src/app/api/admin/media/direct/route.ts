import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions";
import { signDirectUpload, finishDirectUpload, cancelDirectUpload, reuseExistingDirectUpload } from "@/lib/media/direct-upload";
import { audit } from "@/lib/audit/log";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { duplicateDetailsById } from "@/lib/media/duplicates";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 32 * 1024) return NextResponse.json({ error: "Invalid upload request." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }); }
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "editContent")) return NextResponse.json({ error: "Sign in to manage media." }, { status: 403 });
  if (typeof body.cancelTicket === "string") {
    try { await cancelDirectUpload(actor.id, body.cancelTicket); return NextResponse.json({ canceled: true }); }
    catch { return NextResponse.json({ error: "The upload could not be canceled safely." }, { status: 400 }); }
  }
  try {
    if (typeof body.ticket === "string" && body.duplicateChoice === "USE_EXISTING" && typeof body.existingId === "string") {
      const item = await reuseExistingDirectUpload(actor.id, body.ticket, body.existingId);
      await audit(actor.id, "MEDIA_DUPLICATE_REUSED", "Media", item.id);
      return NextResponse.json({ item });
    }
    if (typeof body.ticket === "string") {
      const result = await finishDirectUpload(actor.id, body.ticket, body.duplicateChoice === "UPLOAD_ANYWAY");
      if (result.kind === "duplicate") return NextResponse.json({ error: "Duplicate media detected.", duplicate: await duplicateDetailsById(result.existingId), ticket: body.ticket }, { status: 409 });
      await audit(actor.id, "MEDIA_UPLOADED", "Media", result.item.id);
      return NextResponse.json({ item: result.item });
    }
    if (!await consumeRateLimit("media-sign", actor.id, 100, 60 * 60_000)) return NextResponse.json({ error: "Upload limit reached. Please try again later." }, { status: 429 });
    return NextResponse.json(await signDirectUpload(actor.id, body));
  } catch { return NextResponse.json({ error: "The upload could not be verified. Check the file type, size and storage connection, then try again." }, { status: 400 }); }
}
