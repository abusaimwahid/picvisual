import { prisma } from "@/lib/db/client";

export async function getDashboardData() {
  const [publishedPages, draftPages, projects, media, enquiries, activity] = await Promise.all([
    prisma.page.count({ where: { status: "PUBLISHED" } }), prisma.page.count({ where: { status: "DRAFT" } }), prisma.project.count({ where: { status: { not: "ARCHIVED" } } }), prisma.media.count(), prisma.contactSubmission.count({ where: { status: "NEW" } }), prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return { publishedPages, draftPages, projects, media, enquiries, activity };
}
