import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { readSessionToken, SESSION_COOKIE } from "./session";

export type AdminUser = { id: string; name: string | null; email: string; role: "OWNER" | "ADMIN" | "EDITOR"; isActive: boolean };

export async function getCurrentUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;
  try { const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, isActive: true } }); return user?.isActive ? user : null; } catch { return null; }
}

export async function requireUser() { const user = await getCurrentUser(); if (!user) redirect("/admin/login"); return user; }
