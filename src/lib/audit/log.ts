import { prisma } from "@/lib/db/client";

export async function audit(userId: string | undefined, action: string, entityType: string, entityId?: string, metadata?: Record<string, string | number | boolean>) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId, metadata } });
}
