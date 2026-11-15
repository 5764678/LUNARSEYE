// capture.mjs — turns the real LUNARSEYE pages into film material.
//
// Run the product locally first (the deployed branch: API on :8000, web on :3000), then:
//   NODE_PATH=$(npm root -g) node scripts/capture.mjs <job> [<job> ...]
//
// Jobs
//   ov      Overview, playing at 5 d/s over the 90-day window: full-viewport frame sequence
//   il      Illumination & Earth, playing at 5 d/s over 2027: frame sequence
//   tr      Terrain, playing at 5 d/s with a slow orbit drag: frame sequence
//   static  Compare (every mission state) and Data: full pages, cutouts, layout
//
// Nothing on the page is edited. Playback is the product's own Play button; the browser clock is
// paused and stepped 1/30 s per captured frame so every frame is a real, reproducible page state.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SEQ = path.join(ROOT, "public/seq");
const TEX = path.join(ROOT, "public/textures");
const LAYOUT = path.join(ROOT, "src/layout");
const GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const pad = (n) => String(n).padStart(4, "0");

/** Every laid-out element with a class or its own text: the coordinate table the scenes use. */
const collect = (page) =>
  page.evaluate(() => {
    const out = [];
    const keep = new Set(["CANVAS", "INPUT", "TABLE", "TR", "TH", "TD", "H1", "H2", "H3", "BUTTON", "A", "SVG", "LI", "SUMMARY"]);
    for (const e of document.querySelectorAll("header, header *, aside, aside *, main, main *")) {
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cls = typeof e.className === "string" ? e.className : (e.className?.baseVal ?? "");
      const own = [...e.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();
      if (!cls && !own && !keep.has(e.tagName)) continue;
      out.push({
        tag: e.tagName.toLowerCase(),
        cls,
        text: own.slice(0, 90),
        x: +r.x.toFixed(1),
        y: +r.y.toFixed(1),
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
      });
    }
    return out;
  });

const saveLayout = (name, data) => {
  mkdir(LAYOUT);
  fs.writeFileSync(path.join(LAYOUT, `${name}.json`), JSON.stringify(data));
};

async function open(browser, route, selector, viewport, dsf = 2) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: dsf });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(selector, { timeout: 300_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(3000);
  if (errors.length) console.log("page errors:", errors.join(" | "));
  return { context, page };
}

/** A 2x screenshot straight from the browser (Playwright's own screenshot waits on animation
 *  frames, which a paused clock never delivers). The browser's capture waits for the next
 *  composited frame; with the clock paused the page is idle, so a no-op background-colour
 *  override (the page paints its own background over it) is toggled until the frame arrives. */
async function grabber(page, dsf = 2) {
  const cdp = await page.context().newCDPSession(page);
  const view = page.viewportSize();
  let flip = 0;
  return async (file, clip) => {
    const box = clip ?? { x: 0, y: 0, width: view.width, height: view.height };
    const send = cdp.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale: dsf } });
    let done = false;
    send.then(() => (done = true), () => (done = true));
    for (let waited = 0; !done; waited += 100) {
      await sleep(100);
      if (!done && waited % 400 === 300)
        await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 5, g: 7, b: 10, a: flip++ % 2 ? 254 : 255 } });
    }
    const r = await send;
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  };
}

/** Press the product's Play button under a paused clock and capture one frame per 1/30 s. */
async function playSequence({ browser, name, route, selector, viewport, frames, rate = "5 d/s", clip, perFrame, before }) {
  const { context, page } = await open(browser, route, selector, viewport);
  const dir = path.join(SEQ, name);
  mkdir(dir);
  await page.getByRole("button", { name: rate, exact: true }).click();
  await sleep(400);
  if (before) await before(page);
  saveLayout(name, { viewport, elements: await collect(page) });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const grab = await grabber(page);
  const box = clip ? await clip(page) : undefined;
  if (box) saveLayout(`${name}-clip`, box);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await sleep(300);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    // frame 0 is the instant Play is pressed: one 17 ms tick paints it
    await page.clock.fastForward(i === 0 ? 17 : i % 3 === 0 ? 34 : 33);
    if (perFrame) await perFrame(page, i);
    await sleep(120); // let the tick's paint land before asking for it
    await grab(path.join(dir, `f${pad(i)}.png`), box);
    if (i % 20 === 0) {
      const stamp = (await page.locator(".controls").first().innerText()).match(/\d{4}-\d\d-\d\d \d\d:\d\d/)?.[0];
      console.log(`${name} f${i}/${frames}  sim ${stamp}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
  }
  await context.close();
}

const bbox = async (page, selector, nth = 0) => {
  const b = await page.locator(selector).nth(nth).boundingBox();
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
};

const JOBS = {
  ov: (browser) =>
    playSequence({
      browser,
      name: "ov",
      route: "/?window=90d",
      selector: ".lanes-grid",
      viewport: { width: 1920, height: 1080 },
      frames: Number(process.env.FRAMES ?? 320),
    }),

  il: (browser) =>
    playSequence({
      browser,
      name: "il",
      route: "/illumination",
      selector: ".sky-chart",
      viewport: { width: 1920, height: 1080 },
      frames: Number(process.env.FRAMES ?? 125),
    }),

  tr: async (browser) => {
    let start;
    await playSequence({
      browser,
      name: "tr",
      route: "/terrain",
      selector: "table.data",
      viewport: { width: 1920, height: 1080 },
      frames: Number(process.env.FRAMES ?? 125),
      before: async (page) => {
        const c = await bbox(page, "canvas");
        start = { x: c.x + c.width * 0.62, y: c.y + c.height * 0.6 };
      },
      // a slow real orbit: the scene's own OrbitControls, dragged half a pixel per frame
      perFrame: async (page, i) => {
        if (i === 0) {
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
        }
        await page.mouse.move(start.x - i * 0.5, start.y);
      },
    });
  },

  // Compare and Data are captured at a 1120 px wide window (the same desktop layout, reflowed) at
  // 3x, so on film the questions and their answers sit in one frame at a readable size.
  static: async (browser) => {
    mkdir(TEX);
    const W = 1120;
    // ---- Compare: the mission questions, answered the way a user would ----
    {
      const viewport = { width: W, height: 2300 };
      const { context, page } = await open(browser, "/compare", ".rec-name", viewport, 3);
      const rec = () => page.locator(".card.recommendation").innerText();
      const settle = async (previous) => {
        if (previous !== undefined)
          await page.waitForFunction((p) => document.querySelector(".card.recommendation")?.innerText !== p, previous, { timeout: 120_000 });
        await page.waitForLoadState("networkidle").catch(() => {});
        await sleep(1500);
      };
      const park = () => page.mouse.move(W / 2, 2290);
      const snap = async (state) => {
        await page.screenshot({ path: path.join(TEX, `cmp-${state}.png`) });
        saveLayout(`cmp-${state}`, { viewport, elements: await collect(page) });
        console.log(`compare ${state}:`, (await rec()).split("\n").slice(1, 5).join(" · ").slice(0, 170));
      };
      await park();
      await snap("c0");

      // 1. the mission depends on sunlight: Critical
      let before = await rec();
      await page.getByRole("group", { name: /depend on sunlight/ }).getByRole("button", { name: "Critical" }).click();
      await park();
      await settle(before);
      await snap("c1");

      // 2. a hard limit: the longest darkness the mission can survive
      const dark = page.getByLabel(/Longest darkness it can survive/);
      await dark.click();
      await park();
      await sleep(300);
      await snap("c2focus");
      await dark.pressSequentially("7", { delay: 60 });
      await sleep(300);
      await snap("c2typed");
      before = await rec();
      await dark.press("Enter");
      await settle(before);
      await snap("c2");
      await context.close();
    }

    // ---- Data: the dataset registry, then with one record's files and hashes opened ----
    const viewport = { width: W, height: 1400 };
    const { context, page } = await open(browser, "/data", "section.card", viewport, 3);
    await page.mouse.move(W / 2, 1390);
    await page.screenshot({ path: path.join(TEX, "dat-d0.png") });
    saveLayout("dat-d0", { viewport, elements: await collect(page) });
    await page.locator("section.card summary").nth(1).click();
    await page.mouse.move(W / 2, 1390);
    await sleep(800);
    await page.screenshot({ path: path.join(TEX, "dat-d1.png") });
    saveLayout("dat-d1", { viewport, elements: await collect(page) });
    await context.close();
  },
};

const jobs = process.argv.slice(2);
if (!jobs.length || jobs.some((j) => !JOBS[j])) {
  console.log(`usage: capture.mjs <${Object.keys(JOBS).join("|")}> ...`);
  process.exit(1);
}
const browser = await chromium.launch({ args: GL });
for (const job of jobs) {
  const t = Date.now();
  await JOBS[job](browser);
  console.log(`${job} done in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
await browser.close();
