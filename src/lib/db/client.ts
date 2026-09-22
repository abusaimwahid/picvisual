import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function hasDatabaseUrl() {
  return process.env.PICVISUAL_DATABASE_DISABLED !== "1" && Boolean(process.env.DATABASE_URL);
}
