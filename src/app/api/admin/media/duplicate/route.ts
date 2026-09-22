import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions";
import { findExactDuplicate } from "@/lib/media/duplicates";

const requestSchema = z.object({ contentHash: z.string().regex(/^[a-f0-9]{64}$/) });

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "editContent")) return NextResponse.json({ error: "Sign in to manage media." }, { status: 403 });
  try {
    const parsed = requestSchema.parse(await request.json());
    return NextResponse.json({ duplicate: await findExactDuplicate(parsed.contentHash) });
  } catch {
    return NextResponse.json({ error: "Invalid duplicate lookup." }, { status: 400 });
  }
}
