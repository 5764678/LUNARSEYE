// Derive slide images from the real captures in ../assets/live (crops, composites, thumbnails).
// Nothing here changes what the UI shows: only crops, joins side by side, and resizes.
// Usage: node prep_images.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const LIVE = path.resolve(__dirname, "../assets/live");
const OUT = path.resolve(__dirname, "../assets/derived");
fs.mkdirSync(OUT, { recursive: true });
const PANEL = { r: 11, g: 15, b: 20, alpha: 1 }; // #0B0F14
const BG = { r: 5, g: 7, b: 10, alpha: 1 }; // #05070A

const ex = (file, left, top, width, height) =>
  sharp(path.join(LIVE, file)).extract({ left, top, width, height }).toBuffer();

/** Join buffers horizontally (top-aligned) with a gap, on a panel-coloured strip. */
async function hjoin(parts, gap, bg = PANEL) {
  const norm = parts.map((p) => (Buffer.isBuffer(p) ? { buf: p, dy: 0 } : p));
  const metas = await Promise.all(norm.map((p) => sharp(p.buf).metadata()));
  const w = metas.reduce((s, m) => s + m.width, 0) + gap * (parts.length - 1);
  const h = Math.max(...metas.map((m, i) => m.height + norm[i].dy));
  let x = 0;
  const comps = norm.map((p, i) => { const c = { input: p.buf, left: x, top: p.dy }; x += metas[i].width + gap; return c; });
  return sharp({ create: { width: w, height: h, channels: 4, background: bg } }).composite(comps).png().toBuffer();
}
async function vjoin(parts, gap, bg = PANEL) {
  const metas = await Promise.all(parts.map((p) => sharp(p).metadata()));
  const w = Math.max(...metas.map((m) => m.width));
  const h = metas.reduce((s, m) => s + m.height, 0) + gap * (parts.length - 1);
  let y = 0;
  const comps = parts.map((p, i) => { const c = { input: p, left: 0, top: y }; y += metas[i].height + gap; return c; });
  return sharp({ create: { width: w, height: h, channels: 4, background: bg } }).composite(comps).png().toBuffer();
}
/** Fit a buffer inside a canvas (top-left aligned) of w x h px, panel coloured. */
async function onCanvas(buf, w, h, name, { align = "left" } = {}) {
  const m = await sharp(buf).metadata();
  const scale = Math.min(w / m.width, h / m.height);
  const rw = Math.round(m.width * scale), rh = Math.round(m.height * scale);
  const resized = await sharp(buf).resize(rw, rh, { kernel: "lanczos3" }).toBuffer();
  const left = align === "center" ? Math.round((w - rw) / 2) : 0;
  const top = align === "center" ? Math.round((h - rh) / 2) : 0;
  await sharp({ create: { width: w, height: h, channels: 4, background: PANEL } })
    .composite([{ input: resized, left, top }]).jpeg({ quality: 92 }).toFile(path.join(OUT, name));
  console.log("wrote", name, `${rw}x${rh} on ${w}x${h}`);
}

(async () => {
  const CW = 2426, CH = 750; // compare "screen" canvas: 12.13" x 3.75" at 200 px/in

  // ---- Compare step 1: the three mission questions (text + answer buttons) ----
  {
    const left = await ex("compare-default-questions.png", 30, 12, 930, 350);
    const right = await ex("compare-default-questions.png", 3030, 92, 720, 270);
    await onCanvas(await hjoin([left, { buf: right, dy: 80 }], 40), CW, CH, "cmp-1-questions.jpg", { align: "center" });
  }
  // ---- Compare step 2: a hard limit entered, and the sites it rules out with reasons ----
  {
    const limit = await ex("compare-slope5-questions.png", 30, 380, 1860, 235); // hard-limit section incl. the 5 filled in
    const table = await ex("compare-slope5-recommendation.png", 30, 470, 1860, 270); // ranking rows with "Excluded: ..."
    await onCanvas(await vjoin([limit, table], 30), CW, CH, "cmp-2-limits.jpg", { align: "center" });
  }
  // ---- Compare step 3: one recommended site with its reasons ----
  {
    const rec = await ex("compare-default-recommendation.png", 30, 20, 1870, 465);
    await onCanvas(rec, CW, CH, "cmp-3-recommendation.jpg", { align: "center" });
  }

  // ---- Sky chart card (Illumination page) ----
  await sharp(path.join(LIVE, "illumination-full.png"))
    .extract({ left: 609, top: 192, width: 3198, height: 1018 })
    .resize(2400, null).jpeg({ quality: 92 }).toFile(path.join(OUT, "sky-chart.jpg"));
  // ---- Evidence drawer (top of the panel) ----
  await sharp(path.join(LIVE, "evidence-drawer.png"))
    .extract({ left: 2803, top: 19, width: 1027, height: 515 })
    .resize(1600, null).jpeg({ quality: 92 }).toFile(path.join(OUT, "evidence-drawer-crop.jpg"));

  // ---- Full-screen stills for full-bleed slides and the filmstrip ----
  for (const [src, dst] of [
    ["overview-full.png", "overview.jpg"],
    ["terrain-full.png", "terrain.jpg"],
    ["illumination-full.png", "illumination.jpg"],
    ["compare-default-full.png", "compare.jpg"],
    ["compare-slope5-full.png", "compare-slope5.jpg"],
    ["data-full.png", "data.jpg"],
    ["overview-ridge-full.png", "overview-ridge.jpg"],
  ]) {
    await sharp(path.join(LIVE, src)).resize(1920, 1080, { fit: "cover" }).jpeg({ quality: 90 }).toFile(path.join(OUT, dst));
    await sharp(path.join(LIVE, src)).resize(640, 360, { fit: "cover" }).jpeg({ quality: 86 }).toFile(path.join(OUT, dst.replace(".jpg", "-thumb.jpg")));
  }
  await sharp(path.join(__dirname, "../assets/derived/hero.jpg")).extract({ left: 690, top: 0, width: 1008, height: 1350 }).jpeg({ quality: 90 }).toFile(path.join(OUT, "globe-crop.jpg"));
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
