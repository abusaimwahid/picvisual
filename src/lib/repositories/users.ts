import { prisma } from "@/lib/db/client";
export const listUsers = () => prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
