import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions";
import { signDirectUpload, finishDirectUpload } from "@/lib/media/direct-upload";
import { audit } from "@/lib/audit/log";
import { consumeRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "editContent")) return NextResponse.json({ error: "Sign in to manage media." }, { status: 403 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.ticket === "string") { const item = await finishDirectUpload(actor.id, body.ticket); await audit(actor.id, "MEDIA_UPLOADED", "Media", item.id); return NextResponse.json({ item }); }
    if (!await consumeRateLimit("media-sign", actor.id, 100, 60 * 60_000)) return NextResponse.json({ error: "Upload limit reached. Please try again later." }, { status: 429 });
    return NextResponse.json(await signDirectUpload(actor.id, body));
  } catch { return NextResponse.json({ error: "The upload could not be verified. Check the file type, size and storage connection, then try again." }, { status: 400 }); }
}
