const { chromium } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.QA_BASE || "http://localhost:3000";
const output = process.env.QA_OUT || "artifacts/offline-master-final";
fs.mkdirSync(output, { recursive: true });

(async () => {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is required");
  const db = new PrismaClient();
  const user = await db.user.findFirst({ where: { isActive: true } });
  const project = await db.project.findUniqueOrThrow({ where: { slug: "apparel-color-and-texture" } });
  if (!user) throw new Error("No active local admin user");
  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ userId: user.id, role: user.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addCookies([{ name: "picvisual_admin", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();

  const publicAboutBefore = await page.goto(base + "/about", { waitUntil: "networkidle" }).then(() => page.locator("h1").innerText());
  await page.goto(base + "/admin/pages/about", { waitUntil: "networkidle" });
  const originalAbout = await page.getByLabel("Headline").inputValue();
  await page.getByLabel("Headline").fill("PRIVATE STUDIO DRAFT QA — NEVER PUBLISH");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click(); await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); const aboutDraftUrl = page.url(); const aboutDraftNoticeText = await page.locator(".admin-notice").textContent().catch(() => ""); const draftNotice = /draft saved/i.test(aboutDraftNoticeText || "") || aboutDraftUrl.includes("success=draft-saved");
  await page.goto(base + "/about", { waitUntil: "networkidle" });
  const publicAboutDuringDraft = await page.locator("h1").innerText();
  await page.goto(base + "/admin/pages/about/preview", { waitUntil: "networkidle" });
  const aboutPreview = await page.locator("h1").innerText();
  await page.goto(base + "/admin/pages/about", { waitUntil: "networkidle" });
  await page.getByLabel("Headline").fill(originalAbout);
  await page.getByRole("button", { name: "Publish", exact: true }).click(); await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); const aboutPublishUrl = page.url(); const aboutPublishNoticeText = await page.locator(".admin-notice").textContent().catch(() => ""); const aboutPublishNotice = /published/i.test(aboutPublishNoticeText || "") || aboutPublishUrl.includes("success=published");

  await page.goto(base + `/admin/projects/${project.id}`, { waitUntil: "networkidle" });
  const summary = page.getByLabel("Short summary");
  await summary.fill("PRIVATE CASE STUDY DRAFT QA — NEVER PUBLISH");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click(); await page.waitForLoadState("networkidle");
  await page.goto(base + "/case-studies/apparel-color-and-texture", { waitUntil: "networkidle" });
  const publicCaseDuringDraft = await page.locator(".case-hero-copy>p").innerText();
  await page.goto(base + `/admin/projects/${project.id}/preview`, { waitUntil: "networkidle" });
  const casePreview = await page.locator(".case-hero-copy>p").innerText();
  await page.goto(base + `/admin/projects/${project.id}`, { waitUntil: "networkidle" });
  await page.getByLabel("Short summary").fill("A visual post-production selection from PicVisual.");
  await page.getByRole("button", { name: "Publish", exact: true }).click(); await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); const casePublishUrl = page.url(); const casePublishNoticeText = await page.locator(".admin-notice").textContent().catch(() => ""); const casePublishNotice = /published/i.test(casePublishNoticeText || "") || casePublishUrl.includes("success=published");
  await page.waitForTimeout(400); await page.goto(base + `/case-studies/apparel-color-and-texture?qa=${Date.now()}`, { waitUntil: "networkidle" });
  const publicCaseAfterPublish = await page.locator(".case-hero-copy>p").innerText();

  await page.goto(base + "/admin/pages/about", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Choose from media library" }).first().click();
  const modal = await page.locator(".media-picker-dialog").evaluate(element => { const rect = element.getBoundingClientRect(); return { withinViewport: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth, top: rect.top, bottom: rect.bottom, height: rect.height, viewport: innerHeight }; });
  await page.screenshot({ path: path.join(output, "admin-media-picker.png") });

  const revisions = await db.pageRevision.findMany({ where: { page: { slug: "about" } }, select: { note: true } });
  const result = { draftNotice, aboutDraftUrl, aboutDraftNoticeText, aboutPublishNotice, aboutPublishUrl, aboutPublishNoticeText, aboutDraftIsolated: publicAboutDuringDraft === publicAboutBefore && !publicAboutDuringDraft.includes("PRIVATE"), aboutPreviewShowsDraft: aboutPreview.includes("PRIVATE"), caseDraftIsolated: !publicCaseDuringDraft.includes("PRIVATE"), casePreviewShowsDraft: casePreview.includes("PRIVATE"), casePublishNotice, casePublishUrl, casePublishNoticeText, publicCaseAfterPublish, privateCopyPublished: publicCaseAfterPublish.includes("PRIVATE"), modal, revisionNotes: revisions.map(item => item.note) };
  fs.writeFileSync(path.join(output, "admin-workflows.json"), JSON.stringify(result, null, 2));
  console.log(result);
  await context.close(); await browser.close(); await db.$disconnect();
  if (!draftNotice || !aboutPublishNotice || !result.aboutDraftIsolated || !result.aboutPreviewShowsDraft || !result.caseDraftIsolated || !result.casePreviewShowsDraft || !casePublishNotice || result.privateCopyPublished || !modal.withinViewport || !revisions.some(item => item.note === "about:published") || !revisions.some(item => item.note === "about:draft")) process.exitCode = 1;
})().catch(async error => { console.error(error); process.exitCode = 1; });
