-- Add immutable editorial snapshots for Project / Case Study records.
CREATE TABLE "ProjectRevision" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "authorId" TEXT,
  "action" TEXT NOT NULL,
  "publicationState" "ProjectStatus" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectRevision_projectId_createdAt_idx" ON "ProjectRevision"("projectId", "createdAt");

ALTER TABLE "ProjectRevision"
  ADD CONSTRAINT "ProjectRevision_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectRevision"
  ADD CONSTRAINT "ProjectRevision_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION prevent_project_revision_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Project revisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ProjectRevision_immutable"
BEFORE UPDATE OR DELETE ON "ProjectRevision"
FOR EACH ROW EXECUTE FUNCTION prevent_project_revision_mutation();
