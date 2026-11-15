// Hi-res capture of the real globe (NASA SVS colour map, SPICE-lit, site markers) with the page chrome hidden.
// Usage: NODE_PATH=$(npm root -g) node capture_hero.js [dsf=2]
const { chromium } = require("playwright");
const path = require("path");
const BASE = "https://lunarseye.onrender.com";
const PEAK = "6f10133c-c805-5f9a-bca5-2bbd2058efff";
const DSF = Number(process.argv[2] || 2);
const OUT = path.resolve(__dirname, "../assets/live", `hero-globe-${DSF}x.png`);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DSF, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?site=${PEAK}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector(".globe-loading", { state: "detached", timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(6000);
  // Hide everything except the globe canvas and make it fill the viewport.
  await page.addStyleTag({
    content: `
    .topbar, .sidebar, .side, .hud, .hud-note, .intro, .timeline, .timeline-panel, .controls, header, aside { display: none !important; }
    html, body, .app { display: block !important; height: 100vh !important; overflow: hidden !important; }
    .main { position: fixed !important; inset: 0 !important; padding: 0 !important; overflow: hidden !important; }
    .top-row { display: block !important; height: 100vh !important; }
    .top-row > *:not(.globe) { display: none !important; }
    .globe { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; }
    .globe .viz-fill { width: 100% !important; height: 100% !important; }
    `,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(15000);
  log("screenshot", DSF + "x");
  await page.screenshot({ path: OUT, timeout: 400000 });
  log("saved", OUT);
  await browser.close();
})().catch((e) => { console.error("FATAL", String(e).slice(0, 300)); process.exit(1); });
