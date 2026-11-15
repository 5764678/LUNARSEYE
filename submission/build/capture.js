// Capture real stills of the live LUNARSEYE deployment for the slides.
// Usage: NODE_PATH=$(npm root -g) node capture.js [baseUrl]
// Output: ../assets/live/*.png (2x). Pure screenshots of the real UI; nothing is edited or mocked.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "https://lunarseye.onrender.com";
const OUT = path.resolve(__dirname, "../assets/live");
fs.mkdirSync(OUT, { recursive: true });

const PEAK = "6f10133c-c805-5f9a-bca5-2bbd2058efff"; // Peak near Shackleton
const RIDGE = "91d5b1cd-a013-5587-a197-97254c02e844"; // Connecting ridge
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const mk = async (dsf) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf, colorScheme: "dark" });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") log("console.error:", m.text().slice(0, 160)); });
    return { ctx, page };
  };
  const helpers = (page) => ({
    go: async (p, settleMs = 4000) => {
      log("goto", p);
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 180000 });
      await page.waitForTimeout(settleMs);
    },
    shot: async (name, target) => {
      const file = path.join(OUT, name + ".png");
      try {
        if (target) await target.screenshot({ path: file, timeout: 240000 });
        else await page.screenshot({ path: file, timeout: 240000 });
        log("saved", name, (fs.statSync(file).size / 1e6).toFixed(2) + " MB");
      } catch (e) { log("FAILED", name, String(e).slice(0, 160).replace(/\n/g, " ")); }
    },
    gone: async (sel, t = 90000) => { try { await page.waitForSelector(sel, { state: "detached", timeout: t }); } catch { log("still present:", sel); } },
  });

  // ---------- Pass 1: no WebGL, 2x ----------
  {
    const { ctx, page } = await mk(2);
    const { go, shot } = helpers(page);

    const compareShots = async (suffix) => {
      await page.waitForSelector(".recommendation", { timeout: 120000 }).catch(() => log("no recommendation card", suffix));
      await page.waitForTimeout(2500);
      await shot(`compare-${suffix}-full`);
      for (const [sel, nm] of [[".mission", "questions"], [".recommendation", "recommendation"], [".verdict", "tradeoffs"]]) {
        const el = page.locator(sel).first();
        if (await el.count()) await shot(`compare-${suffix}-${nm}`, el);
      }
    };
    await go("/compare", 4000); await compareShots("default");
    if (await page.locator(".card.table-scroll").count()) await shot("compare-default-measures", page.locator(".card.table-scroll").first());
    try {
      await page.locator("table.compare button.inspect").first().click();
      await page.waitForTimeout(1200);
      await shot("evidence-drawer");
      await page.keyboard.press("Escape");
    } catch (e) { log("drawer FAILED", String(e).slice(0, 120)); }
    await go("/compare?power=none&comms=none&landing=high", 3000); await compareShots("landing");
    await go("/compare?max_slope=5", 3000); await compareShots("slope5");
    await go("/data", 4000); await shot("data-full");
    await go(`/illumination?site=${PEAK}`, 9000); await shot("illumination-full");
    await ctx.close();
  }

  // ---------- Pass 2: WebGL pages, 1x, long timeouts ----------
  {
    const { ctx, page } = await mk(1);
    const { go, shot, gone } = helpers(page);
    await go(`/?site=${PEAK}`, 3000);
    await gone(".globe-loading", 180000);
    await page.waitForTimeout(10000);
    await shot("overview-full");
    await shot("overview-globe", page.locator(".globe .viz-fill").first());

    await go(`/terrain?site=${PEAK}`, 3000);
    await gone(".globe-loading", 180000);
    await page.waitForTimeout(20000);
    await shot("terrain-full");
    await shot("terrain-view", page.locator(".terrain-view").first());

    await go(`/?site=${RIDGE}`, 3000);
    await gone(".globe-loading", 180000);
    await page.waitForTimeout(10000);
    await shot("overview-ridge-full");
    await ctx.close();
  }

  await browser.close();
  log("done");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
