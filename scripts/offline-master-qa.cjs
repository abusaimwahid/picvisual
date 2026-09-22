const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.QA_BASE || "http://localhost:3000";
const output = process.env.QA_OUT || "artifacts/offline-master-after";
const viewports = [[1920,1080],[1440,900],[1366,768],[1024,1366],[768,1024],[430,932],[390,844]];
const routes = ["/", "/work", "/case-studies", "/case-studies/apparel-color-and-texture", "/services", "/about", "/contact"];
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const results = [];
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 1024, isMobile: width <= 1024 });
    const page = await context.newPage();
    let errors = [], network = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", response => { if (response.status() >= 400) network.push({ status: response.status(), url: response.url() }); });
    page.on("requestfailed", request => network.push({ failure: request.failure()?.errorText, url: request.url() }));
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(900);
      const info = await page.evaluate(() => {
        const headings = [...document.querySelectorAll("h1,h2,h3")].map(element => { const rect = element.getBoundingClientRect(); return { text: element.textContent?.trim().slice(0,80), left: rect.left, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, clipped: rect.left < -1 || rect.right > innerWidth + 1 }; });
        return { title: document.title, description: document.querySelector('meta[name="description"]')?.getAttribute("content"), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"), ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content"), twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"), h1: document.querySelector("h1")?.textContent?.trim(), overflow: document.documentElement.scrollWidth > innerWidth + 1, headings: headings.filter(item => item.clipped), footer: document.querySelectorAll(".footer").length, images: [...document.images].map(image => ({ alt: image.alt, loaded: image.complete && image.naturalWidth > 0, src: image.currentSrc })) };
      });
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
      await page.screenshot({ path: path.join(output, `${slug}-${width}.png`), fullPage: true });
      const extra = route === "/" ? await page.evaluate(() => ({ pinSpacers: document.querySelectorAll(".pin-spacer").length, homeHeight: document.documentElement.scrollHeight, workTop: document.querySelector(".pv-work-field")?.getBoundingClientRect().top + scrollY, selectedTop: document.querySelector(".work-section")?.getBoundingClientRect().top + scrollY })) : route === "/case-studies/apparel-color-and-texture" ? await page.evaluate(() => ({ galleryItems: document.querySelectorAll(".case-gallery figure").length, visualUrls: [...document.querySelectorAll(".case-hero img,.case-gallery img")].map(image => image.currentSrc), optionalEmptySections: [...document.querySelectorAll(".case-story")].filter(element => !element.textContent?.trim()).length })) : route === "/about" ? await page.evaluate(() => ({ sections: document.querySelectorAll(".studio-page>section").length })) : {};
      results.push({ width, height, route, status: response?.status(), errors, network, ...info, ...extra });
      errors = []; network = [];
    }
    await context.close();
  }
  const security = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const securePage = await security.newPage();
  await securePage.goto(base + "/admin/pages/about/preview", { waitUntil: "networkidle" });
  results.push({ route: "/admin/pages/about/preview", anonymousUrl: securePage.url(), previewProtected: securePage.url().includes("/admin/login") });
  if (process.env.AUTH_SECRET) {
    const { PrismaClient } = require("@prisma/client"); const db = new PrismaClient();
    const user = await db.user.findFirst({ where: { isActive: true }, orderBy: { role: "asc" } });
    const project = await db.project.findUnique({ where: { slug: "apparel-color-and-texture" }, select: { id: true } });
    await db.$disconnect();
    if (user) {
      const { SignJWT } = await import("jose");
      const token = await new SignJWT({ userId: user.id, role: user.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
      await security.addCookies([{ name: "picvisual_admin", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
      const adminRoutes = ["/admin/pages/about", "/admin/projects", ...(project ? [`/admin/projects/${project.id}`] : [])];
      for (const route of adminRoutes) {
        await securePage.goto(base + route, { waitUntil: "networkidle" });
        const name = route.includes("pages/about") ? "admin-about" : route.split("/").length > 3 ? "admin-project-editor" : "admin-projects";
        await securePage.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
        results.push({ route, authenticated: true, overflow: await securePage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });
      }
      await securePage.goto(base + "/admin/pages/about", { waitUntil: "networkidle" });
      await securePage.getByRole("button", { name: "Choose from media library" }).first().click();
      const modal = await securePage.locator(".media-picker-dialog").evaluate(element => { const rect = element.getBoundingClientRect(); return { withinViewport: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth, scrollable: element.scrollHeight >= element.clientHeight }; });
      results.push({ route: "/admin/pages/about#media-picker", authenticated: true, modal });
    } else results.push({ route: "/admin", authenticated: false });
  }
  await security.close();
  fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  const failures = results.filter(item => item.status && (item.status >= 400 || item.overflow || item.errors?.length || item.network?.length || item.headings?.length || !item.title || !item.description || !item.canonical || !item.ogTitle || !item.twitterCard));
  console.log(JSON.stringify({ pages: results.length, failures, previewProtected: results.find(item => item.previewProtected)?.previewProtected }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
