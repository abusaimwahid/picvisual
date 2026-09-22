const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.QA_BASE || "http://localhost:3000";
const output = process.env.QA_OUT || "artifacts/offline-master-final";
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], network = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) network.push({ status: response.status(), url: response.url() }); });
  await page.goto(base, { waitUntil: "networkidle" });
  const workTop = await page.locator(".pv-work-field").evaluate(element => element.getBoundingClientRect().top + scrollY);
  for (let y = 0; y <= workTop + 2200; y += 180) { await page.evaluate(position => scrollTo(0, position), y); await page.waitForTimeout(35); }
  await page.screenshot({ path: path.join(output, "homepage-selected-work-scrolled.png") });
  for (let y = workTop + 2200; y >= Math.max(0, workTop - 300); y -= 260) { await page.evaluate(position => scrollTo(0, position), y); await page.waitForTimeout(30); }
  await page.goto(base + "/about", { waitUntil: "networkidle" });
  await page.goBack({ waitUntil: "networkidle" });
  const desktop = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, cursors: document.querySelectorAll(".pv-cursor").length, spacers: document.querySelectorAll(".pin-spacer").length, bodyOverflow: document.body.style.overflow }));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, spacers: document.querySelectorAll(".pin-spacer").length }));
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1366, height: 768 }); await page.waitForTimeout(500);
  const resizedMenu = await page.evaluate(() => ({ bodyOverflow: document.body.style.overflow, expanded: document.querySelector(".menu-toggle")?.getAttribute("aria-expanded") }));
  await page.goto(base + "/case-studies/apparel-color-and-texture", { waitUntil: "networkidle" });
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= max; y += 420) { await page.evaluate(position => scrollTo(0, position), y); await page.waitForTimeout(80); }
  await page.waitForTimeout(600);
  const chamois = await page.evaluate(() => { const images = [...document.querySelectorAll(".case-hero img,.case-gallery img")]; return { imageCount: images.length, loaded: images.filter(image => image.complete && image.naturalWidth > 0).length, uniqueSources: new Set(images.map(image => image.currentSrc)).size, galleryItems: document.querySelectorAll(".case-gallery figure").length }; });
  await page.screenshot({ path: path.join(output, "chamois-scrolled.png"), fullPage: true });
  const result = { errors, network, desktop, mobile, resizedMenu, chamois };
  fs.writeFileSync(path.join(output, "interactions.json"), JSON.stringify(result, null, 2));
  console.log(result);
  await browser.close();
  if (errors.length || network.length || desktop.overflow || desktop.cursors !== 1 || desktop.spacers !== 1 || mobile.overflow || mobile.spacers !== 0 || resizedMenu.bodyOverflow || resizedMenu.expanded !== "false" || chamois.imageCount !== 4 || chamois.loaded !== 4 || chamois.uniqueSources !== 4) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
