import { createHash } from "node:crypto";
import { prisma, hasDatabaseUrl } from "@/lib/db/client";
// A database window is shared across serverless instances. Raw addresses are never stored.
export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  if (!hasDatabaseUrl()) return true;
  await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  const key = `${scope}:${createHash("sha256").update(`${process.env.AUTH_SECRET ?? "picvisual"}:${identity}`).digest("hex")}`;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${new Date(Date.now() + windowMs)})
    ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
    "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}
