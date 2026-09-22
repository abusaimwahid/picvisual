-- Add lightweight tags and optional exact-content/aspect metadata without replacing existing Media records.
ALTER TABLE "Media" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "Media" ADD COLUMN "aspectClass" TEXT;

-- A 5% tolerance treats visually square assets as square while leaving unknown dimensions unclassified.
UPDATE "Media"
SET "aspectClass" = CASE
  WHEN "width" IS NULL OR "height" IS NULL OR "width" <= 0 OR "height" <= 0 THEN NULL
  WHEN ABS("width" - "height")::numeric / GREATEST("width", "height") <= 0.05 THEN 'SQUARE'
  WHEN "width" > "height" THEN 'LANDSCAPE'
  ELSE 'PORTRAIT'
END;

CREATE INDEX "Media_contentHash_idx" ON "Media"("contentHash");
CREATE INDEX "Media_aspectClass_idx" ON "Media"("aspectClass");

CREATE TABLE "MediaTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaTagAssignment" (
  "tagId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaTagAssignment_pkey" PRIMARY KEY ("tagId", "mediaId")
);

CREATE UNIQUE INDEX "MediaTag_name_key" ON "MediaTag"("name");
CREATE INDEX "MediaTag_createdAt_idx" ON "MediaTag"("createdAt");
CREATE INDEX "MediaTagAssignment_mediaId_idx" ON "MediaTagAssignment"("mediaId");

ALTER TABLE "MediaTagAssignment"
  ADD CONSTRAINT "MediaTagAssignment_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "MediaTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaTagAssignment"
  ADD CONSTRAINT "MediaTagAssignment_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
