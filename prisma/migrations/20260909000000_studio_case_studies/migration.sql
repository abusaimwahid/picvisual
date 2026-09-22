-- Additive case-study presentation fields. Existing project and media records are preserved.
ALTER TABLE "Project"
  ADD COLUMN "isCaseStudy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "caseStudyOrder" INTEGER,
  ADD COLUMN "eyebrow" TEXT,
  ADD COLUMN "intro" TEXT,
  ADD COLUMN "challenge" TEXT,
  ADD COLUMN "approach" TEXT,
  ADD COLUMN "productionNotes" TEXT,
  ADD COLUMN "outcome" TEXT;

ALTER TABLE "ProjectMedia"
  ADD COLUMN "layout" TEXT NOT NULL DEFAULT 'LANDSCAPE';

CREATE INDEX "Project_isCaseStudy_caseStudyOrder_idx"
  ON "Project"("isCaseStudy", "caseStudyOrder");
