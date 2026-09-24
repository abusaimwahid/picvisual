import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/login";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const result = await authenticateAdmin(input, address);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const token = await createSessionToken({ userId: result.user.id, role: result.user.role });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
