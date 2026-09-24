import bcrypt from "bcryptjs";
import { audit } from "@/lib/audit/log";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/admin";

export type AuthenticatedAdmin = { id: string; role: "OWNER" | "ADMIN" | "EDITOR" };
export type AdminLoginResult = { user: AuthenticatedAdmin } | { error: string; status: number };

export async function authenticateAdmin(input: unknown, address: string): Promise<AdminLoginResult> {
  if (!hasDatabaseUrl() || !process.env.AUTH_SECRET) {
    return { error: "Sign-in is temporarily unavailable. Please contact the site owner.", status: 503 };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again.", status: 400 };
  }

  const identity = parsed.data.email.toLowerCase();
  try {
    const allowedEmail = await consumeRateLimit("login-email", identity, 10, 15 * 60_000);
    const allowedAddress = await consumeRateLimit("login-ip", address, 50, 15 * 60_000);
    if (!allowedEmail || !allowedAddress) return { error: "Too many attempts. Please try again in 15 minutes.", status: 429 };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again.", status: 503 };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: identity } });
    if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return { error: "Invalid email or password.", status: 401 };
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(user.id, "AUTH_LOGIN", "User", user.id);
    return { user: { id: user.id, role: user.role } };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again.", status: 503 };
  }
}
