import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "picvisual_admin";
const SESSION_DURATION = 60 * 60 * 8;

type SessionPayload = { userId: string; role: "OWNER" | "ADMIN" | "EDITOR"; issuedAt?: number };

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to use the admin application.");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(getSecret());
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !process.env.AUTH_SECRET) return null;
  try { const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] }); return typeof payload.userId === "string" && (payload.role === "OWNER" || payload.role === "ADMIN" || payload.role === "EDITOR") ? { userId: payload.userId, role: payload.role, issuedAt: payload.iat } : null; } catch { return null; }
}

export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DURATION };
