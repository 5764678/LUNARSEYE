// End-to-end smoke test of the demo path against any running LUNARIS (local or deployed).
//
//   BASE_URL=http://localhost:3000 NODE_PATH=$(npm root -g) node scripts/smoke.mjs
//
// Needs `playwright` resolvable (preinstalled in the Claude cloud container). Exits non-zero
// on the first failed check. Checks: API health through the web proxy; each of the five
// pages renders with no console errors; the compare verdict states the known demo-trio
// result (Peak near Shackleton leads on slope/sunlight/Earth, worst on roughness; Malapert
// first under the landing profile); an evidence badge opens its drawer with a source.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) failures.push(what);
};

const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
check(health?.status === "ok", `/api/health is ok (${JSON.stringify(health?.checks?.map((c) => c.status))})`);

const browser = await chromium.launch();
const pages = [
  ["/", ".lanes-grid, .lanes-placeholder"],
  ["/illumination", ".sky-chart"],
  ["/terrain", "table.data"],
  ["/compare?profile=landing", ".verdict-text"],
  ["/data", "section.card"],
];
for (const [route, selector] of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  let rendered = true;
  try {
    await page.waitForSelector(selector, { timeout: 120_000 });
  } catch {
    rendered = false;
  }
  check(rendered && errors.length === 0, `${route} renders without console errors ${errors.join(" | ")}`);

  if (route.startsWith("/compare") && rendered) {
    const verdict = await page.textContent(".verdict-text");
    check(
      /Peak near Shackleton leads on slope, sunlight and darkness and Earth visibility; trade-off: worst on roughness/.test(verdict),
      "compare verdict matches the known demo-trio result",
    );
    const scores = await page.locator(".card:has(h2:has-text('profile score')) tbody th").allTextContents();
    check(scores[0] === "Malapert massif", `landing profile ranks Malapert first (got ${scores[0]})`);
    await page.locator("table.compare .ev").first().click();
    const drawer = await page.locator(".drawer").textContent();
    check(/Sources/.test(drawer) && /Method/.test(drawer), "evidence badge opens source + method");
  }
  await page.close();
}
await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
