const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.QA_BASE || "http://localhost:3000";
const output = process.env.QA_OUT || "artifacts/homepage-glitch-elimination/final";
fs.mkdirSync(output, { recursive: true });

const failures = [];
const runtime = { console: [], network: [] };
const assert = (condition, message) => { if (!condition) failures.push(message); };
const waitForSettledScroll = (page, ms = 420) => page.waitForTimeout(ms);

function watchRuntime(page, label) {
  page.on("pageerror", error => runtime.console.push(`${label}: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error" || /GSAP|hydration/i.test(message.text())) runtime.console.push(`${label}: ${message.type()}: ${message.text()}`);
  });
  page.on("response", response => { if (response.status() >= 400) runtime.network.push({ label, status: response.status(), url: response.url() }); });
  page.on("requestfailed", request => {
    const error = request.failure()?.errorText;
    if (error !== "net::ERR_ABORTED") runtime.network.push({ label, url: request.url(), error });
  });
}

async function workMetrics(page) {
  return page.locator(".pv-work-field").evaluate(section => {
    const spacer = section.closest(".pin-spacer");
    const flowElement = spacer || section;
    const top = flowElement.getBoundingClientRect().top + scrollY;
    const distance = spacer ? spacer.getBoundingClientRect().height - section.getBoundingClientRect().height : 0;
    return {
      top,
      distance,
      sectionHeight: section.getBoundingClientRect().height,
      count: Number(section.dataset.projectCount),
      mode: section.dataset.workMode,
      spacers: document.querySelectorAll(".pin-spacer").length,
      planes: [...section.querySelectorAll(".pv-work-plane")].map(plane => plane.dataset.projectSlug),
    };
  });
}

async function workState(page) {
  return page.locator(".pv-work-field").evaluate(section => {
    const effectiveOpacity = element => {
      let opacity = 1;
      for (let current = element; current && current !== document.documentElement; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
      return opacity;
    };
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth && effectiveOpacity(element) > .12 && style.visibility !== "hidden";
    };
    const heading = section.querySelector("h2");
    const planes = [...section.querySelectorAll(".pv-work-plane")];
    return {
      heading: heading?.textContent?.trim(),
      headingVisible: heading ? visible(heading) : false,
      visiblePlanes: planes.filter(visible).length,
      opacities: planes.map(plane => Number(getComputedStyle(plane).opacity)),
      transforms: planes.map(plane => getComputedStyle(plane).transform),
      projectSlugs: planes.map(plane => plane.dataset.projectSlug),
    };
  });
}

async function gotoPosition(page, position, screenshotName) {
  await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), Math.max(0, position));
  await waitForSettledScroll(page);
  if (screenshotName) await page.screenshot({ path: path.join(output, screenshotName) });
  return workState(page);
}

async function auditDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  watchRuntime(page, "desktop-audit");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  const metrics = await workMetrics(page);
  assert(metrics.count === 1, `expected one real Selected Work project, found ${metrics.count}`);
  assert(metrics.mode === "single", `expected single Selected Work mode, found ${metrics.mode}`);
  assert(metrics.planes.length === 1 && new Set(metrics.planes).size === 1, "Selected Work contains duplicated project planes");
  assert(metrics.spacers === 1, `expected one desktop pin spacer, found ${metrics.spacers}`);
  assert(metrics.distance >= 620 && metrics.distance <= 720, `single-project pin distance is not compact: ${metrics.distance}`);

  const checkpoints = [
    [metrics.top - 520, "development-to-selected-work.png"],
    [metrics.top + metrics.distance * .04, "selected-work-entry.png"],
    [metrics.top + metrics.distance * .31, "selected-work-focus.png"],
    [metrics.top + metrics.distance * .69, "selected-work-pass-camera.png"],
    [metrics.top + metrics.distance * .96, "selected-work-exit.png"],
    [metrics.top + metrics.distance + 560, "selected-work-to-workflow.png"],
  ];
  const states = [];
  for (const [position, name] of checkpoints) states.push({ name, state: await gotoPosition(page, position, name) });
  for (const item of states.slice(1, 4)) {
    assert(item.state.headingVisible, `${item.name} has no readable Selected Work heading`);
  }
  for (const item of states.slice(1, 5)) {
    assert(item.state.visiblePlanes === 1, `${item.name} has ${item.state.visiblePlanes} visible project planes`);
    assert(item.state.opacities[0] >= .7, `${item.name} project opacity fell below the visible floor`);
  }

  const clipped = [];
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= max; y += 180) {
    await page.evaluate(value => scrollTo({ top: value, behavior: "instant" }), y);
    await page.waitForTimeout(18);
    const fragments = await page.evaluate(() => [...document.querySelectorAll(".hero-copy h1,.editorial h2,.section-heading h2,.refined-copy h2,.pv-safe-copy h2,.pv-work-field h2,.motion-title h2,.system-copy h2,.reasons>h2,.faq>div>h2,.project-cta>h2")].flatMap((heading, index) => {
      const rect = heading.getBoundingClientRect();
      let opacity = 1;
      for (let element = heading; element && element !== document.documentElement; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
      return rect.top < 0 && rect.bottom > 0 && opacity > .12 ? [{ index, text: heading.textContent?.trim(), top: rect.top, bottom: rect.bottom, opacity }] : [];
    }));
    clipped.push(...fragments);
  }
  assert(clipped.length === 0, `visible clipped heading fragments remain: ${JSON.stringify(clipped.slice(0, 3))}`);

  for (const [step, delay] of [[110, 45], [520, 70], [1400, 45]]) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    for (let y = 0; y < max; y += step) { await page.mouse.wheel(0, step); await page.waitForTimeout(delay); }
    for (let y = max; y > metrics.top - 300; y -= step * 1.5) { await page.mouse.wheel(0, -step * 1.5); await page.waitForTimeout(Math.max(20, delay / 2)); }
    const reverseState = await gotoPosition(page, metrics.top + metrics.distance * .3);
    assert(reverseState.visiblePlanes === 1, `reverse scroll lost the project at step ${step}`);
  }

  await page.evaluate(value => scrollTo({ top: value, behavior: "instant" }), Math.round(max * .52));
  const beforeRefresh = await page.evaluate(() => scrollY);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const afterRefresh = await page.evaluate(() => ({ y: scrollY, spacers: document.querySelectorAll(".pin-spacer").length, planes: document.querySelectorAll(".pv-work-plane").length }));
  assert(Math.abs(afterRefresh.y - beforeRefresh) < 50, "halfway refresh did not restore scroll position");
  assert(afterRefresh.spacers === 1 && afterRefresh.planes === 1, "halfway refresh duplicated or lost Selected Work lifecycle state");

  await page.goto(`${base}/work`, { waitUntil: "networkidle" });
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const routeReturn = await page.evaluate(() => ({ spacers: document.querySelectorAll(".pin-spacer").length, planes: document.querySelectorAll(".pv-work-plane").length }));
  assert(routeReturn.spacers === 1 && routeReturn.planes === 1, "Home → Work → Back left duplicate or missing camera state");

  const resizeStates = [];
  for (const size of [[1920, 1080], [1440, 900], [1024, 900], [768, 900], [430, 844], [390, 844], [768, 900], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width: size[0], height: size[1] });
    await page.waitForTimeout(360);
    resizeStates.push(await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, spacers: document.querySelectorAll(".pin-spacer").length, planes: document.querySelectorAll(".pv-work-plane").length })));
  }
  assert(resizeStates.every(state => !state.overflow && state.planes === 1 && state.spacers <= 1), `resize stress failed: ${JSON.stringify(resizeStates)}`);
  assert(resizeStates.at(-1).spacers === 1, "desktop pin was not restored after 1920 → 390 → 1920 resize");
  await context.close();
  return { metrics, states, clipped, beforeRefresh, afterRefresh, routeReturn, resizeStates };
}

async function auditResponsive(browser) {
  const results = [];
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1024,1366],[768,1024],[430,932],[390,844]]) {
    const touch = width <= 1024;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: width <= 430 });
    const page = await context.newPage();
    watchRuntime(page, `${width}x${height}`);
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await page.locator(".pv-work-field").scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      projectCount: Number(document.querySelector(".pv-work-field")?.dataset.projectCount),
      planes: document.querySelectorAll(".pv-work-plane").length,
      spacers: document.querySelectorAll(".pin-spacer").length,
      workHeight: document.querySelector(".pv-work-field")?.getBoundingClientRect().height,
    }));
    await page.screenshot({ path: path.join(output, `selected-work-${width}x${height}.png`) });
    assert(!result.overflow, `${width}x${height} has horizontal overflow`);
    assert(result.projectCount === 1 && result.planes === 1, `${width}x${height} duplicated or lost CHAMOIS`);
    assert(touch ? result.spacers === 0 : result.spacers === 1, `${width}x${height} has an incorrect pin lifecycle`);
    results.push(result);
    await context.close();
  }
  return results;
}

async function recordHomepage(browser, name, width, height, step, delay, touch = false) {
  const videoDir = path.join(output, ".video-tmp", name);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: width <= 430, recordVideo: { dir: videoDir, size: { width, height } } });
  const page = await context.newPage();
  watchRuntime(page, name);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const video = page.video();
  let last = -1;
  for (let index = 0; index < 600; index++) {
    const position = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
    if (position.y >= position.max - 2 || position.y === last) break;
    last = position.y;
    await page.mouse.wheel(0, Math.min(step, position.max - position.y));
    await page.waitForTimeout(delay);
  }
  await page.waitForTimeout(650);
  await context.close();
  await video.saveAs(path.join(output, `${name}.webm`));
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  if (process.env.QA_RECORDINGS_ONLY === "1") {
    await recordHomepage(browser, "homepage-normal-1920x1080", 1920, 1080, 470, 235);
    await recordHomepage(browser, "homepage-fast-1920x1080", 1920, 1080, 1250, 70);
    await recordHomepage(browser, "homepage-mobile-390x844", 390, 844, 380, 220, true);
    await browser.close();
    console.log("Final homepage recordings saved");
    return;
  }
  const desktop = await auditDesktop(browser);
  const responsive = await auditResponsive(browser);
  if (process.env.QA_SKIP_RECORDINGS !== "1") {
    await recordHomepage(browser, "homepage-normal-1920x1080", 1920, 1080, 470, 235);
    await recordHomepage(browser, "homepage-fast-1920x1080", 1920, 1080, 1250, 70);
    await recordHomepage(browser, "homepage-mobile-390x844", 390, 844, 380, 220, true);
  }
  await browser.close();
  assert(runtime.console.length === 0, `console errors: ${JSON.stringify(runtime.console)}`);
  assert(runtime.network.length === 0, `network errors: ${JSON.stringify(runtime.network)}`);
  const report = { failures, runtime, desktop, responsive };
  fs.writeFileSync(path.join(output, "homepage-video-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ failures, runtime, responsive, work: desktop.metrics }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
