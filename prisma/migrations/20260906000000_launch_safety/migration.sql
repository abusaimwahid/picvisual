-- Additive only. Existing records and relations remain intact.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "publishedSlug" TEXT, ADD COLUMN "publishedSnapshot" JSONB;
CREATE UNIQUE INDEX "Project_publishedSlug_key" ON "Project"("publishedSlug");
ALTER TABLE "Service" ADD COLUMN "publishedSnapshot" JSONB;
ALTER TABLE "ContactSubmission" ADD COLUMN "projectLink" TEXT, ADD COLUMN "internalNotes" TEXT, ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "ContactSubmission_requestId_key" ON "ContactSubmission"("requestId");
CREATE TABLE "RateLimit" ("key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key"));
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
