const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");

const db = new PrismaClient();
const base = process.env.QA_BASE_URL || "http://localhost:3000";

(async () => {
  if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Local QA database required");
  const project = await db.project.findUniqueOrThrow({ where: { slug: "apparel-color-and-texture" }, select: { id: true } });
  const user = await db.user.findFirstOrThrow({ where: { isActive: true }, orderBy: { role: "asc" } });
  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ userId: user.id, role: user.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addCookies([{ name: "picvisual_admin", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const results = [];
  try {
    for (const route of ["/admin/projects", "/admin/case-studies", `/admin/projects/${project.id}`, "/admin/pages/about", "/admin/services"]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      results.push({ route, violations: audit.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })) });
    }
    await page.goto(`${base}/admin/projects/${project.id}`, { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: "Choose from media library" }).first();
    await trigger.focus(); await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialogAudit = await new AxeBuilder({ page }).include(".media-picker-overlay").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    await page.keyboard.press("Escape");
    const focusReturned = await trigger.evaluate((element) => element === document.activeElement);
    await page.getByLabel("Short summary").fill("Unsaved state accessibility check");
    await expect(page.getByText("UNSAVED CHANGES", { exact: true })).toBeVisible();
    const revisionButtons = await page.getByRole("button", { name: "Restore to Draft", exact: true }).count();
    results.push({ route: "media-picker", violations: dialogAudit.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), focusReturned, revisionButtons });
    fs.mkdirSync("artifacts/offline-final-content", { recursive: true });
    fs.writeFileSync("artifacts/offline-final-content/admin-accessibility.json", JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    if (results.some((item) => item.violations.length) || !focusReturned || revisionButtons < 1) process.exitCode = 1;
  } finally { await browser.close(); await db.$disconnect(); }
})().catch(async (error) => { console.error(error); await db.$disconnect(); process.exitCode = 1; });
