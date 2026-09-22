-- Add lightweight, non-duplicating organization for existing Media records.
CREATE TABLE "MediaCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCollectionItem" (
  "collectionId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaCollectionItem_pkey" PRIMARY KEY ("collectionId", "mediaId")
);

CREATE UNIQUE INDEX "MediaCollection_name_key" ON "MediaCollection"("name");
CREATE INDEX "MediaCollection_createdAt_idx" ON "MediaCollection"("createdAt");
CREATE INDEX "MediaCollectionItem_mediaId_idx" ON "MediaCollectionItem"("mediaId");

ALTER TABLE "MediaCollectionItem"
  ADD CONSTRAINT "MediaCollectionItem_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "MediaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaCollectionItem"
  ADD CONSTRAINT "MediaCollectionItem_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
