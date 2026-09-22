const { chromium } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const prisma = new PrismaClient();
const output = process.env.QA_OUT || "artifacts/homepage-glitch-elimination/project-counts";
const port = Number(process.env.QA_PORT || 3117);
const fixturePrefix = "qa-selected-work-";
const expectedDistances = { 1: 670, 2: 1188, 3: 1706, 5: 2743 };
fs.mkdirSync(output, { recursive: true });

let selectedWorkSection;
let originalContent;
let server;

async function removeFixtures() {
  await prisma.project.deleteMany({ where: { slug: { startsWith: fixturePrefix } } });
}

async function restore() {
  if (selectedWorkSection && originalContent) await prisma.pageSection.update({ where: { id: selectedWorkSection.id }, data: { content: originalContent } });
  await removeFixtures();
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([new Promise(resolve => server.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 4000))]);
  server = undefined;
}

async function startServer(count) {
  const env = { ...process.env, PICVISUAL_READER_CACHE_NAMESPACE: `selected-work-${count}-${Date.now()}` };
  server = spawn("npm", ["run", "dev", "--", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  server.stdout.on("data", chunk => { log += chunk.toString(); });
  server.stderr.on("data", chunk => { log += chunk.toString(); });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`fixture server exited early\n${log}`);
    try { const response = await fetch(`http://localhost:${port}`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`fixture server did not become ready\n${log}`);
}

async function installCount(count, source, mediaIds) {
  await removeFixtures();
  const fixtureIds = [];
  for (let index = 1; index < count; index++) {
    const mediaId = mediaIds[index % mediaIds.length];
    const fixture = await prisma.project.create({ data: {
      slug: `${fixturePrefix}${index}`,
      title: `QA Composition ${index + 1}`,
      category: "Controlled local fixture",
      summary: "Temporary local Selected Work camera fixture.",
      description: "Temporary local Selected Work camera fixture.",
      status: "PUBLISHED",
      featured: true,
      featuredOrder: index,
      isCaseStudy: false,
      services: ["Camera sequence QA"],
      heroMediaId: mediaId,
      thumbnailMediaId: mediaId,
      publishedAt: new Date(),
    } });
    fixtureIds.push(fixture.id);
  }
  await prisma.pageSection.update({ where: { id: selectedWorkSection.id }, data: { content: { ...originalContent, projectIds: [source.id, ...fixtureIds] } } });
}

async function inspectCount(count) {
  await startServer(count);
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://localhost:${port}/admin/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Work email").fill(process.env.ADMIN_EMAIL);
  await page.getByLabel("Password").fill(process.env.ADMIN_INITIAL_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(url => !url.pathname.endsWith("/admin/login"), { timeout: 15000 });
  await page.goto(`http://localhost:${port}/admin/homepage/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const metrics = await page.locator(".pv-work-field").evaluate(section => {
    const spacer = section.closest(".pin-spacer");
    const flow = spacer || section;
    return {
      top: flow.getBoundingClientRect().top + scrollY,
      distance: spacer ? spacer.getBoundingClientRect().height - section.getBoundingClientRect().height : 0,
      count: Number(section.dataset.projectCount),
      mode: section.dataset.workMode,
      slugs: [...section.querySelectorAll(".pv-work-plane")].map(plane => plane.dataset.projectSlug),
    };
  });
  const states = [];
  for (const progress of [.08, .36, .7, .96]) {
    await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), metrics.top + metrics.distance * progress);
    await page.waitForTimeout(450);
    states.push(await page.locator(".pv-work-field").evaluate(section => ({
      title: section.querySelector("h2")?.textContent?.trim(),
      visiblePlanes: [...section.querySelectorAll(".pv-work-plane")].filter(plane => {
        const rect = plane.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth && Number(getComputedStyle(plane).opacity) > .12;
      }).length,
    })));
  }
  await page.screenshot({ path: path.join(output, `selected-work-${count}-projects.png`) });
  await browser.close();
  await stopServer();
  return { count, metrics, states, errors };
}

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_INITIAL_PASSWORD) throw new Error("Local owner credentials are unavailable for private fixture preview QA");
  selectedWorkSection = await prisma.pageSection.findFirst({ where: { page: { slug: "home" }, type: "selectedWork" } });
  if (!selectedWorkSection || !selectedWorkSection.content || typeof selectedWorkSection.content !== "object") throw new Error("Selected Work section is unavailable");
  originalContent = structuredClone(selectedWorkSection.content);
  const source = await prisma.project.findFirst({ where: { slug: "apparel-color-and-texture", status: "PUBLISHED" }, include: { media: { orderBy: { order: "asc" } } } });
  if (!source) throw new Error("Published CHAMOIS source project is unavailable");
  const mediaIds = [...new Set([source.thumbnailMediaId, source.heroMediaId, ...source.media.map(item => item.mediaId)].filter(Boolean))];
  if (!mediaIds.length) throw new Error("CHAMOIS media is unavailable");
  const results = [];
  try {
    for (const count of [1, 2, 3, 5]) {
      await installCount(count, source, mediaIds);
      const result = await inspectCount(count);
      if (result.metrics.count !== count) throw new Error(`fixture ${count} rendered ${result.metrics.count} projects`);
      if (new Set(result.metrics.slugs).size !== count) throw new Error(`fixture ${count} rendered duplicate project identities`);
      if (result.metrics.mode !== (count === 1 ? "single" : "sequence")) throw new Error(`fixture ${count} used ${result.metrics.mode} mode`);
      if (Math.abs(result.metrics.distance - expectedDistances[count]) > 3) throw new Error(`fixture ${count} distance ${result.metrics.distance} did not match ${expectedDistances[count]}`);
      if (result.states.some(state => state.visiblePlanes < 1)) throw new Error(`fixture ${count} entered an empty camera state`);
      if (result.errors.length) throw new Error(`fixture ${count} browser errors: ${result.errors.join(" | ")}`);
      results.push(result);
    }
    fs.writeFileSync(path.join(output, "project-count-qa.json"), JSON.stringify({ results }, null, 2));
    console.log(JSON.stringify(results.map(result => ({ count: result.count, mode: result.metrics.mode, distance: result.metrics.distance, uniqueProjects: new Set(result.metrics.slugs).size, visibleFloor: Math.min(...result.states.map(state => state.visiblePlanes)) })), null, 2));
  } finally {
    await stopServer();
    await restore();
    await prisma.$disconnect();
  }
}

process.on("SIGINT", async () => { await stopServer(); await restore(); await prisma.$disconnect(); process.exit(130); });
main().catch(async error => { console.error(error); await stopServer(); await restore().catch(() => undefined); await prisma.$disconnect().catch(() => undefined); process.exitCode = 1; });
