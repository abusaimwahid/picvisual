const { chromium, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const base = process.env.QA_BASE_URL || "http://localhost:3000";

(async () => {
  if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Local QA database required");
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_INITIAL_PASSWORD) throw new Error("Local admin credentials required");
  const project = await db.project.findUniqueOrThrow({ where: { slug: "apparel-color-and-texture" } });
  const baseline = await db.projectRevision.findFirstOrThrow({ where: { projectId: project.id, action: "PUBLISH" }, orderBy: { createdAt: "asc" } });
  const publicSummary = project.publishedSnapshot.summary;
  const marker = `LOCAL REVISION QA ${Date.now()} — PRIVATE DRAFT`;
  const startedAt = new Date();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminContext.newPage();
  const anonymous = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  admin.on("dialog", (dialog) => dialog.accept());
  try {
    await admin.goto(`${base}/admin/login`);
    await admin.getByLabel("Work email").fill(process.env.ADMIN_EMAIL);
    await admin.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_INITIAL_PASSWORD);
    await admin.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(admin).toHaveURL(`${base}/admin`);

    await admin.goto(`${base}/admin/projects/${project.id}`);
    await admin.getByLabel("Short summary").fill(marker);
    await admin.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(admin).toHaveURL(/success=draft-saved/);
    const draftRevision = await db.projectRevision.findFirstOrThrow({ where: { projectId: project.id, action: "DRAFT_SAVE", createdAt: { gte: startedAt } }, orderBy: { createdAt: "desc" } });
    if (!draftRevision.authorId || draftRevision.publicationState !== "DRAFT") throw new Error("Draft revision actor/state missing");

    await anonymous.goto(`${base}/case-studies/apparel-color-and-texture`);
    await expect(anonymous.getByText(publicSummary, { exact: true })).toBeVisible();
    await expect(anonymous.getByText(marker, { exact: true })).toHaveCount(0);
    await admin.goto(`${base}/admin/projects/${project.id}/preview`);
    await expect(admin.getByText(marker, { exact: true })).toBeVisible();

    await admin.goto(`${base}/admin/projects/${project.id}`);
    const baselineRow = admin.locator(".admin-revision-list > div").filter({ has: admin.locator(`input[value="${baseline.id}"]`) });
    await baselineRow.getByRole("button", { name: "Restore to Draft", exact: true }).click();
    await expect(admin).toHaveURL(/success=revision-restored-to-draft/);
    const restoredRevision = await db.projectRevision.findFirstOrThrow({ where: { projectId: project.id, action: "RESTORE_TO_DRAFT", createdAt: { gte: startedAt } }, orderBy: { createdAt: "desc" } });
    if (!restoredRevision.authorId || restoredRevision.publicationState !== "DRAFT") throw new Error("Restore revision actor/state missing");
    await anonymous.reload();
    await expect(anonymous.getByText(publicSummary, { exact: true })).toBeVisible();
    await admin.goto(`${base}/admin/projects/${project.id}/preview`);
    await expect(admin.getByText(publicSummary, { exact: true })).toBeVisible();
    await expect(admin.getByText(marker, { exact: true })).toHaveCount(0);

    await admin.goto(`${base}/admin/projects/${project.id}`);
    await admin.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(admin).toHaveURL(/success=published/);
    await anonymous.reload();
    await expect(anonymous.getByText(publicSummary, { exact: true })).toBeVisible();
    const publishedRevision = await db.projectRevision.findFirstOrThrow({ where: { projectId: project.id, action: "PUBLISH", createdAt: { gte: startedAt } }, orderBy: { createdAt: "desc" } });
    if (!publishedRevision.authorId || publishedRevision.publicationState !== "PUBLISHED") throw new Error("Publish revision actor/state missing");

    let immutable = false;
    try { await db.projectRevision.update({ where: { id: draftRevision.id }, data: { action: "PUBLISH" } }); }
    catch (error) { immutable = /immutable/i.test(String(error)); }
    if (!immutable) throw new Error("Revision mutation was not blocked");
    console.log(JSON.stringify({ draftSave: true, publicUnchangedAfterDraft: true, restoredPreview: true, publicUnchangedAfterRestore: true, publishRestoredVersion: true, actorTracking: true, timestampTracking: [draftRevision, restoredRevision, publishedRevision].every((item) => item.createdAt >= startedAt), immutable: true }, null, 2));
  } finally {
    await adminContext.close(); await anonymous.context().close(); await browser.close(); await db.$disconnect();
  }
})().catch(async (error) => { console.error(error); await db.$disconnect(); process.exitCode = 1; });
