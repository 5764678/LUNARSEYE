// LUNARSEYE slide deck. Usage (from submission/):  node build/build_deck.js && python3 build/postprocess.py
// Reads config/team.json, data/results.json (real numbers from the live Compare API), script/narration.js,
// and images in assets/derived (made by build/prep_images.js from real captures of the live app).
// Output: build/out/LUNARSEYE_deck_raw.pptx + build/out/builds.json (consumed by postprocess.py, which adds transitions and builds).
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");
const SKILL = "/root/.claude/skills/synced/ce5b9b2c-8f7e-4d51-9051-ad067e786a67_1e46804d-73f2-402f-965e-fcc9bc5d0fd4/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const ROOT = path.resolve(__dirname, "..");
const team = JSON.parse(fs.readFileSync(path.join(ROOT, "config/team.json"), "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(ROOT, "data/results.json"), "utf8"));
const narr = require(path.join(ROOT, "script/narration.js"));
const IMG = (f) => path.join(ROOT, "assets/derived", f);
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

// ---------- design system (from apps/web/src/app/tokens.css) ----------
// Calibri ships with PowerPoint on Windows and Mac and is in Google Slides, so the deck looks the same everywhere.
const SANS = "Calibri", MONO = "Calibri";
const THEME = {
  name: "LUNARSEYE Night", headFontFace: SANS, bodyFontFace: SANS,
  colors: {
    dk1: "E6EAEF", lt1: "05070A", dk2: "8D97A6", lt2: "0B0F14",
    accent1: "FFD166", accent2: "6CC3FF", accent3: "B08968", accent4: "46D19F", accent5: "FF9A52", accent6: "B9A3FF",
    hlink: "6CC3FF", folHlink: "B9A3FF",
  },
};
const BG = "05070A", RAISED = "10151C", LINE = "1C232D", LINE2 = "2A3441", CTRL = "667180", FGPRESS = "C3CBD6";
const W = 13.333, H = 7.5, MX = 0.6;
// Face zone: the corner the video editor overlays the presenters' faces on. Keep content out of it.
const ZONE = { x: 9.8, y: 5.7 };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "LUNARSEYE – NASA Space Apps Challenge 2026";
pres.subject = "Lunar south-pole site analysis";
pres.author = team.members.map((m) => m.name).join(", ");
pres.theme = { headFontFace: SANS, bodyFontFace: SANS };
const C = pres.SchemeColor;
const SH = pres.shapes;
const FG = C.text1, MUTED = C.text2, PANEL = C.background2;
const SUN = C.accent1, EARTH = C.accent2, HORIZON = C.accent3, OK = C.accent4, CAUTION = C.accent5, MODEL = C.accent6;

const first = (m) => m.name.split(" ")[0];
const isPH = (t) => typeof t === "string" && t.includes("[");
const phColor = (t) => (isPH(t) ? CAUTION : FG);
const builds = {}; // slideNo -> steps [{trigger, names, delay, dur}]
let slideNo = 0;

// ---------- layouts ----------
const titleOpts = (o) => ({ name: "title", type: "title", fontFace: SANS, color: C.text1, valign: "top", align: "left", margin: 0, ...o });
pres.defineSlideMaster({
  title: "HERO", background: { color: BG },
  objects: [{ placeholder: { options: titleOpts({ x: 0.8, y: 1.55, w: 9.2, h: 2.0, fontSize: 46 }), text: "" } }],
});
pres.defineSlideMaster({
  title: "END", background: { color: BG },
  objects: [{ placeholder: { options: titleOpts({ x: 2.2, y: 1.45, w: 8.93, h: 1.3, fontSize: 58, align: "center", valign: "middle", charSpacing: 22 }), text: "" } }],
});
pres.defineSlideMaster({
  title: "SCREEN", background: { color: BG },
  objects: [{ placeholder: { options: titleOpts({ x: MX, y: 6.62, w: 8.6, h: 0.6, fontSize: 25.5, bold: true }), text: "" } }],
});
pres.defineSlideMaster({
  title: "SPLIT", background: { color: BG },
  objects: [
    { text: { text: "LUNARSEYE  ·  NASA Space Apps Challenge 2026", options: { x: MX, y: 7.05, w: 6.2, h: 0.26, fontFace: MONO, fontSize: 10, color: "8D97A6", margin: 0, charSpacing: 1 } } },
    { placeholder: { options: titleOpts({ x: MX, y: 0.42, w: 6.9, h: 1.25, fontSize: 30, bold: true }), text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: BG },
  objects: [
    { text: { text: "LUNARSEYE  ·  NASA Space Apps Challenge 2026", options: { x: MX, y: 7.05, w: 6.2, h: 0.26, fontFace: MONO, fontSize: 11, color: "8D97A6", margin: 0, charSpacing: 1 } } },
    { placeholder: { options: titleOpts({ x: MX, y: 0.42, w: 10.2, h: 1.0, fontSize: 32, bold: true }), text: "" } },
  ],
  slideNumber: { x: 7.0, y: 7.05, w: 0.6, h: 0.26, fontFace: MONO, fontSize: 11, color: "8D97A6", align: "left" },
});

// ---------- helpers ----------
const T = (s, text, o = {}) => s.addText(text, { isTextBox: true, fontFace: SANS, fontSize: 17.5, color: FG, margin: 0, valign: "top", ...o });
const mono = (s, text, o = {}) => T(s, text, { fontFace: MONO, fontSize: 13, bold: true, color: MUTED, charSpacing: 1.5, ...o });
function chip(s, text, x, y, o = {}) {
  const w = o.w ?? text.length * 0.1 + 0.36;
  s.addText(text, {
    shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.05, x, y, w, h: o.h ?? 0.3, align: "center", valign: "middle", margin: 0,
    fontFace: MONO, fontSize: o.size ?? 10.5, bold: true, charSpacing: 1.5, color: o.color ?? FG,
    line: { color: o.color ?? CTRL, width: 1, dashType: o.dashed ? "dash" : "solid" }, objectName: o.name,
  });
  return w;
}
function box(s, x, y, w, h, o = {}) {
  s.addShape(SH.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.radius ?? 0.08, fill: o.fill === null ? undefined : { color: o.fill ?? PANEL },
    line: { color: o.line ?? LINE2, width: 1, dashType: o.dashed ? "dash" : "solid" }, objectName: o.name,
  });
}
function photo(s, file, x, y, size, alt) {
  s.addImage({ path: path.join(ROOT, "assets/team", file), x, y, w: size, h: size, altText: alt });
  frame(s, x, y, size, size);
}
function frame(s, x, y, w, h) { s.addShape(SH.RECTANGLE, { x, y, w, h, line: { color: LINE2, width: 1 } }); }
function addNotes(s, n) {
  const e = narr.slides.find((x) => x.n === n);
  if (!e) { s.addNotes("APPENDIX. Not part of the 5-7 minute video; use it to answer questions."); return; }
  const rep = (t) => t.replace("[TEAM NAME]", team.team_name);
  let t = `SPEAKER: ${e.who === "A" ? first(team.members[0]) + " (A)" : e.who === "B" ? first(team.members[1] || team.members[0]) + " (B)" : e.who}\n\n`;
  if (e.beats) t += e.beats.map((b) => `[${b.at}] ${b.who}: ${rep(b.text)}`).join("\n") + "\n";
  else t += rep(e.text) + "\n";
  if (e.cues && e.cues.length) t += "\nCUES: " + e.cues.join(" ");
  s.addNotes(t);
}
function slide(master, section, title) {
  slideNo += 1;
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  const n = slideNo;
  s._title = () => s.addText(title, { placeholder: "title", objectName: `title-${n}` });
  if (master === "CONTENT" || master === "SPLIT") s._title(); // other layouts sit on a full-bleed picture: caller adds the title after it
  return s;
}
const step = (n, trigger, names, delay = 0, dur = 500) => { (builds[n] = builds[n] || []).push({ trigger, names, delay, dur }); };
const pct1 = (v) => `${v.toFixed(1)}`;

const S = results.sites, PK = S["Peak near Shackleton"], CR = S["Connecting ridge"], MP = S["Malapert massif"];
const SC = results.scenarios;
const score = (sc, name) => SC[sc].ranking.find((r) => r.name === name).score_100;

// =====================================================================================
// 1  HOOK
// =====================================================================================
pres.addSection({ title: "Hook" });
{
  const s = slide("HERO", "Hook", "Where should we land at the Moon’s south pole?");
  s.addImage({ path: IMG("hero.jpg"), x: 0, y: 0, w: W, h: H, altText: "The Moon lit by the real SPICE Sun direction, with the 27 candidate sites marked near the south pole", objectName: "hero-image" });
  s.addShape(SH.RECTANGLE, { x: 0, y: 0, w: W, h: H, fill: { color: BG, transparency: 60 }, line: { color: BG, width: 0 }, objectName: "hero-dim" });
  s.addText("LUNARSEYE", { isTextBox: true, x: 0.8, y: 0.6, w: 5, h: 0.4, fontFace: SANS, fontSize: 15.5, bold: true, charSpacing: 9, color: FG, margin: 0, objectName: "wordmark-small" });
  s._title();
  // sub-line: three words in the app's data hues, revealed one after the other
  const w1 = 1.8, w2 = 4.0, w3 = 1.9, gap = 0.05, y = 3.7, x1 = 0.8, x2 = x1 + w1 + gap, x3 = x2 + w2 + gap; // widths measured for Calibri bold 20 pt + 3 pt tracking
  const sub = (x, w, runs, name) => T(s, runs, { x, y, w: w + 0.15, h: 0.45, fontFace: MONO, fontSize: 20, bold: true, charSpacing: 3, wrap: false, objectName: name });
  sub(x1, w1, [{ text: "SUNLIGHT", options: { color: SUN } }], "hook-sun");
  sub(x2, w2, [{ text: "·  ", options: { color: MUTED } }, { text: "EARTH LINE OF SIGHT", options: { color: EARTH } }], "hook-earth");
  sub(x3, w3, [{ text: "·  ", options: { color: MUTED } }, { text: "TERRAIN", options: { color: HORIZON } }], "hook-terrain");
  mono(s, `TEAM ${team.team_name.toUpperCase()}  ·  ${team.event.toUpperCase()}  ·  ${team.challenge_title}`, { x: 0.8, y: 6.85, w: 11.5, h: 0.3, color: isPH(team.challenge_title) ? CAUTION : MUTED, objectName: "hook-event" });
  step(1, "auto", ["title-1"], 300, 900);
  step(1, "auto", ["hook-sun"], 500, 600);
  step(1, "auto", ["hook-earth"], 450, 600);
  step(1, "auto", ["hook-terrain"], 450, 600);
  addNotes(s, 1);
}

// =====================================================================================
// 2  PROBLEM
// =====================================================================================
{
  const s = slide("CONTENT", "Hook", "A landing site is a bet on sunlight, Earth and terrain");
  const cards = [
    { hue: SUN, tag: "SUNLIGHT", q: "How long is the Sun up, and how long is the longest night?", a: `${pct1(PK.sunlit_pct)}`, au: " %", b: `${pct1(MP.sunlit_pct)}`, bu: " %", cap: "of 2027 in direct sunlight" },
    { hue: EARTH, tag: "EARTH LINE OF SIGHT", q: "How long is Earth above the local horizon?", a: `${pct1(PK.earth_visible_pct)}`, au: " %", b: `${pct1(MP.earth_visible_pct)}`, bu: " %", cap: "of 2027 with Earth in view" },
    { hue: HORIZON, tag: "TERRAIN", q: "How rough is the ground where we would touch down?", a: `${MP.roughness_rms_m.toFixed(2)}`, au: " m", b: `${PK.roughness_rms_m.toFixed(2)}`, bu: " m", cap: "RMS roughness, lower is better", swap: true },
  ];
  cards.forEach((c, i) => {
    const x = MX + i * (3.9 + 0.215), y = 1.55;
    box(s, x, y, 3.9, 3.95, { name: `prob-card-${i}` });
    s.addShape(SH.OVAL, { x: x + 0.3, y: y + 0.33, w: 0.18, h: 0.18, fill: { color: c.hue }, line: { color: c.hue, width: 0 } });
    mono(s, c.tag, { x: x + 0.62, y: y + 0.29, w: 3.1, h: 0.26, color: c.hue, bold: true });
    T(s, c.q, { x: x + 0.3, y: y + 0.75, w: 3.35, h: 0.85, fontSize: 17.5, color: MUTED });
    const rows = c.swap ? [["MALAPERT MASSIF", c.a, c.au, FG], ["PEAK NEAR SHACKLETON", c.b, c.bu, MUTED]] : [["PEAK NEAR SHACKLETON", c.a, c.au, FG], ["MALAPERT MASSIF", c.b, c.bu, MUTED]];
    rows.forEach((r, k) => {
      const ry = y + 1.65 + k * 0.9;
      mono(s, r[0], { x: x + 0.3, y: ry, w: 3.3, h: 0.24, fontSize: 11.5 });
      T(s, [{ text: r[1], options: { fontSize: 38, bold: true, color: r[3] } }, { text: r[2], options: { fontSize: 21.5, color: r[3] } }], { x: x + 0.3, y: ry + 0.24, w: 3.3, h: 0.62 });
    });
    T(s, c.cap, { x: x + 0.3, y: y + 3.45, w: 3.4, h: 0.3, fontSize: 14.5, color: MUTED });
  });
  T(s, "Same year, same method. Peak near Shackleton wins on sunlight and Earth; Malapert massif wins on smooth ground. The best site depends on the mission.", { x: MX, y: 5.68, w: 9.0, h: 0.85, fontSize: 19.5 });
  mono(s, "2027 · hourly · LOLA 240 m terrain horizon · live Compare API", { x: MX, y: 6.62, w: 9.0, h: 0.3, fontSize: 11 });
  addNotes(s, 2);
}

// =====================================================================================
// 3  WHAT IT IS (full-bleed Overview)
// =====================================================================================
{
  const s = slide("SPLIT", "Hook", "27 cited sites, lit by the real Sun");
  s.addImage({ path: IMG("globe-crop.jpg"), x: W - 5.6, y: 0, w: 5.6, h: H, altText: "The Moon lit by the SPICE Sun direction, with the 27 candidate sites marked near the south pole", objectName: "globe-crop" });
  const pages = [
    ["Overview", "The Moon lit by the real Sun, and an hourly timeline for any site"],
    ["Illumination & Earth", "Sky chart, sunlight and Earth windows, terrain against flat horizon"],
    ["Terrain", "3D south pole; slope and roughness from the 20 m LOLA DEM"],
    ["Compare", "Say what the mission needs, get one recommended site"],
    ["Data", "Every NASA file with its source and SHA-256"],
  ];
  pages.forEach((p, i) => {
    const y = 1.95 + i * 0.86;
    mono(s, String(i + 1), { x: MX, y: y + 0.04, w: 0.4, h: 0.4, fontSize: 20, color: i === 3 ? FG : MUTED });
    T(s, [{ text: p[0], options: { bold: true, fontSize: 21, breakLine: true } }, { text: p[1], options: { fontSize: 15.5, color: MUTED } }], { x: 1.15, y, w: 6.1, h: 0.78 });
    if (i === 3) chip(s, "KEY FEATURE", 3.0, y + 0.07, { w: 1.55, color: FG, size: 11 });
    if (i < pages.length - 1) s.addShape(SH.LINE, { x: MX, y: y + 0.82, w: 6.65, h: 0, line: { color: LINE, width: 0.75 } });
  });
  T(s, "Every number carries a tag that says what kind of evidence it is.", { x: MX, y: 6.4, w: 6.6, h: 0.5, fontSize: 16, color: MUTED });
  addNotes(s, 3);
}

// =====================================================================================
// 4  NASA DATA
// =====================================================================================
pres.addSection({ title: "Data and tools" });
{
  const s = slide("CONTENT", "Data and tools", "Seven NASA sources, each one pinned and checked");
  const rows = [
    ["TERRAIN", HORIZON, "LRO / LOLA elevation model, 240 m", "Terrain skyline at every site; the 3D south-pole mesh"],
    ["TERRAIN", HORIZON, "LOLA south-pole DEM, 20 m (PGDA)", "Slope and roughness at each site, read in HTTP byte ranges"],
    ["SITES", FGPRESS, "PGDA site tiles + NASA candidate regions", "The 27 cited sites (NASA's 2022 list of 13 regions)"],
    ["SUN + EARTH", FG, "NAIF SPICE with the DE440 ephemeris", "Sun and Earth direction from every site, every hour"],
    ["VISUAL", MUTED, "NASA SVS CGI Moon Kit", "The globe picture only, never an input to a number"],
    ["CHECK", OK, "JPL Horizons", "Independent check of Sun and Earth angles"],
    ["CHECK", OK, "Published LOLA illumination maps (PDS)", "Sanity check of our sunlight and Earth visibility"],
  ];
  rows.forEach((r, i) => {
    const y = 1.5 + i * 0.64;
    chip(s, r[0], MX, y + 0.12, { w: 1.45, color: r[1], size: 10 });
    T(s, [
      { text: r[2], options: { bold: true, fontSize: 16.5, breakLine: true } },
      { text: r[3], options: { fontSize: 14.5, color: MUTED } },
    ], { x: 2.2, y: y + 0.02, w: 6.9, h: 0.58 });
    if (i < rows.length - 1) s.addShape(SH.LINE, { x: MX, y: y + 0.63, w: 8.5, h: 0, line: { color: LINE, width: 0.75 } });
  });
  // pipeline
  const px = 9.4, pw = 3.33, ph = 0.88, pg = 0.2;
  const pipe = [["1 · ACQUIRE", "URL, size and SHA-256 pinned"], ["2 · SCIENCE", "SPICE geometry, terrain horizon, slope"], ["3 · API", "FastAPI + PostgreSQL"], ["4 · WEB", "Five pages, evidence on every number"]];
  const names = [];
  pipe.forEach((p, i) => {
    const y = 1.5 + i * (ph + pg);
    s.addText([{ text: p[0], options: { fontFace: MONO, fontSize: 11.5, bold: true, color: MUTED, charSpacing: 1.5, breakLine: true } }, { text: p[1], options: { fontSize: 15.5, color: FG } }],
      { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x: px, y, w: pw, h: ph, fill: { color: PANEL }, line: { color: LINE2, width: 1 }, margin: [6, 11, 6, 11], valign: "middle", objectName: `pipe-${i}` });
    names.push(`pipe-${i}`);
    if (i < pipe.length - 1) { s.addShape(SH.DOWN_ARROW, { x: px + pw / 2 - 0.11, y: y + ph + 0.02, w: 0.22, h: pg - 0.04, fill: { color: CTRL }, line: { color: CTRL, width: 0 }, objectName: `pipe-arrow-${i}` }); names.push(`pipe-arrow-${i}`); }
  });
  step(4, "click", names, 0, 600);
  T(s, "Nothing downloaded is committed. The 2.7 GB 20 m DEM is read as HTTP byte ranges and never downloaded whole.", { x: MX, y: 6.12, w: 8.7, h: 0.55, fontSize: 13.5, color: MUTED });
  addNotes(s, 4);
}

// =====================================================================================
// 5  TOOLS
// =====================================================================================
{
  const s = slide("CONTENT", "Data and tools", "Open tools, tested hard — and AI help, disclosed");
  const cols = [
    ["SCIENCE AND DATA", ["Python 3.11+, NumPy, SciPy", "SpiceyPy (NASA NAIF SPICE)", "rasterio / GDAL for PDS and GeoTIFF", "uv for reproducible installs"]],
    ["API AND STORAGE", ["FastAPI and Pydantic", "SQLAlchemy, PostgreSQL 16 on Neon", "Docker, hosted on Render", "OpenAPI contract, drift-tested"]],
    ["INTERFACE", ["Next.js 16, React 19, TypeScript", "three.js with React Three Fiber", "TanStack Query, Zustand", "IBM Plex type, one colour system"]],
  ];
  cols.forEach((c, i) => {
    const x = MX + i * (3.97 + 0.11);
    box(s, x, 1.45, 3.97, 2.75, { name: `tool-col-${i}` });
    mono(s, c[0], { x: x + 0.3, y: 1.68, w: 3.4, h: 0.26, bold: true });
    T(s, c[1].map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < c[1].length - 1, paraSpaceAfter: 5 } })), { x: x + 0.3, y: 2.1, w: 3.45, h: 1.95, fontSize: 16.5 });
  });
  box(s, MX, 4.35, 12.13, 0.85, { name: "tool-quality" });
  mono(s, "QUALITY", { x: MX + 0.3, y: 4.62, w: 1.2, h: 0.26, bold: true });
  T(s, "pytest + hypothesis  ·  Vitest  ·  checks against JPL Horizons and published LOLA maps  ·  browser smoke test", { x: 2.0, y: 4.58, w: 10.5, h: 0.5, fontSize: 15.5, valign: "middle" });
  box(s, MX, 5.38, 9.0, 1.4, { line: CAUTION, dashed: true, fill: null, name: "ai-box" });
  chip(s, "AI USE", MX + 0.25, 5.55, { color: CAUTION, dashed: true, size: 10.5 });
  T(s, "Claude Code (Anthropic) helped write the code. Sun and Earth positions come from NASA SPICE, not from an AI model. Independent project, not endorsed by NASA. No NASA logos are used.", { x: MX + 0.25, y: 5.95, w: 8.5, h: 0.78, fontSize: 15.5 });
  addNotes(s, 5);
}

// =====================================================================================
// 6  METHOD
// =====================================================================================
pres.addSection({ title: "Method and evidence" });
{
  const s = slide("CONTENT", "Method and evidence", "Hour by hour: sunlight and Earth line of sight");
  chip(s, "ILLUMINATION & EARTH", 10.05, 0.55, { w: 2.68, color: FG });
  s.addImage({ path: IMG("sky-chart.jpg"), x: MX, y: 1.4, w: 12.13, h: 12.13 / 3.1417, altText: "Sky chart from Peak near Shackleton: the terrain skyline in brown, the Sun's path in gold and the Earth's path in blue, with elevation against azimuth", objectName: "sky-chart" });
  frame(s, MX, 1.4, 12.13, 12.13 / 3.1417);
  const steps = [
    ["1  Skyline", "LOLA 240 m: 1,440 directions out to 200 km, eye 2 m"],
    ["2  Sun and Earth", "SPICE direction every hour of 2027 (8,761 samples)"],
    ["3  Whole disc", "Share of each disc above the skyline, not one point"],
    ["4  Honest edges", "A run that touches the edge is shown as ≥"],
  ];
  steps.forEach((p, i) => {
    const x = MX + i * 2.3;
    T(s, [{ text: p[0], options: { bold: true, fontSize: 17, breakLine: true } }, { text: p[1], options: { fontSize: 15, color: MUTED } }], { x, y: 5.42, w: 2.15, h: 1.5 });
  });
  addNotes(s, 6);
}

// =====================================================================================
// 7  EVIDENCE + VALIDATION
// =====================================================================================
{
  const s = slide("CONTENT", "Method and evidence", "Every number shows its evidence");
  const tags = [
    ["OBS", FG, false, "Measured data, as released"],
    ["DERIVED", FGPRESS, false, "Archive product built by the data team (LOLA DEMs)"],
    ["MODEL", MODEL, false, "Output of an authority model (SPICE, DE440)"],
    ["CALC", MUTED, false, "Computed by LUNARSEYE, with the method named"],
    ["ASSUMED", CAUTION, true, "A choice we made: weights, scales, eye height"],
    ["PLACEHOLDER", CAUTION, true, "Stand-in content, never evidence"],
  ];
  tags.forEach((t, i) => {
    const y = 1.55 + i * 0.66;
    chip(s, t[0], MX, y + 0.08, { w: 1.55, color: t[1], dashed: t[2], size: 11 });
    T(s, t[3], { x: 2.4, y: y + 0.03, w: 4.4, h: 0.55, fontSize: 16.5, valign: "middle" });
  });
  T(s, "Click any number in the app to open its source, method, limits and SHA-256.", { x: MX, y: 5.6, w: 6.2, h: 0.7, fontSize: 15.5, color: MUTED });
  const rx = 7.05, rw = 5.68;
  s.addImage({ path: IMG("evidence-drawer-crop.jpg"), x: rx, y: 1.5, w: rw, h: rw / (1027 / 515), altText: "The evidence drawer for one number: LUNARSEYE calculation tag, statement, method, sources and SHA-256", objectName: "evidence-crop" });
  frame(s, rx, 1.5, rw, rw / (1027 / 515));
  const stats = [
    ["0.01″", "Sun and Earth angles vs JPL Horizons (tolerance)"],
    ["≤ 0.05", "vs published LOLA maps (largest gap 0.042)"],
    ["299 + 60", "automated tests: Python + web (14 Nov)"],
  ];
  stats.forEach((st, i) => {
    const x = rx + i * (1.8 + 0.14);
    T(s, [{ text: st[0], options: { fontSize: 25.5, bold: true, breakLine: true } }, { text: st[1], options: { fontSize: 14, color: MUTED } }], { x, y: 4.55, w: 1.82, h: 1.2 });
  });
  addNotes(s, 7);
}

// =====================================================================================
// 8  COMPARE: HOW IT DECIDES  (star feature)
// =====================================================================================
pres.addSection({ title: "Compare" });
{
  const s = slide("CONTENT", "Compare", "Compare: say what the mission needs, get one site");
  chip(s, "COMPARE", 10.95, 0.55, { w: 1.78, color: FG });
  const px = MX, py = 1.55, pw = 12.13, ph = 3.75;
  box(s, px, py, pw, ph, { name: "cmp-panel", radius: 0.04 });
  const imgs = [["cmp-1-questions.jpg", "The Compare page's three mission questions, each answered from Not needed to Critical"], ["cmp-2-limits.jpg", "A 5 degree slope limit entered; Malapert massif and Connecting ridge are excluded with the reason shown"], ["cmp-3-recommendation.jpg", "The recommendation: Peak near Shackleton, 71.3 of 100, clear lead, with the reasons"]];
  imgs.forEach((im, i) => s.addImage({ path: IMG(im[0]), x: px, y: py, w: pw, h: ph, altText: im[1], objectName: `cmp-img-${i + 1}` }));
  frame(s, px, py, pw, ph);
  const caps = [
    ["1", "Say what the mission needs", "Sunlight, Earth line of sight, smooth ground: from not needed to critical. Add hard limits."],
    ["2", "Hard limits rule sites out", "A site over a limit is excluded and listed with the reason, never just scored lower."],
    ["3", "One site, reasons shown", "Score, lead, why, what it gives up, and whether the pick holds if priorities shift."],
  ];
  caps.forEach((c, i) => {
    const x = MX + i * 3.05;
    T(s, [
      { text: c[0], options: { fontFace: MONO, fontSize: 21.5, bold: true, color: MUTED, breakLine: true } },
      { text: c[1], options: { bold: true, fontSize: 17.5, breakLine: true } },
      { text: c[2], options: { fontSize: 14.5, color: MUTED } },
    ], { x, y: 5.45, w: 2.9, h: 1.55, objectName: `cmp-cap-${i + 1}` });
  });
  step(8, "click", ["cmp-img-2", "cmp-cap-2"], 0, 500);
  step(8, "click", ["cmp-img-3", "cmp-cap-3"], 0, 500);
  addNotes(s, 8);
}

// =====================================================================================
// 9  COMPARE: RESULT
// =====================================================================================
{
  const s = slide("CONTENT", "Compare", "Same three sites, three missions, three answers");
  chip(s, "COMPARE", 10.95, 0.55, { w: 1.78, color: FG });
  const cats = ["All needs important", "Only landing safety"];
  const val = (name) => [score("default", name), score("landing_only", name)];
  s.addChart(pres.charts.BAR, [
    { name: "Peak near Shackleton", labels: cats, values: val("Peak near Shackleton") },
    { name: "Connecting ridge", labels: cats, values: val("Connecting ridge") },
    { name: "Malapert massif", labels: cats, values: val("Malapert massif") },
  ], {
    x: MX, y: 1.5, w: 6.5, h: 4.15, barDir: "col", barGrouping: "clustered", barGapWidthPct: 55,
    chartColors: ["E6EAEF", "8D97A6", "566172"], showLegend: true, legendPos: "b", legendFontSize: 12, legendColor: "C3CBD6", legendFontFace: "+mn-lt",
    catAxisLabelColor: "C3CBD6", catAxisLabelFontSize: 13, catAxisLabelFontFace: "+mn-lt", valAxisLabelColor: "8D97A6", valAxisLabelFontSize: 11, valAxisLabelFontFace: "+mn-lt",
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25, valGridLine: { color: "1C232D", size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "E6EAEF", dataLabelFontSize: 12, dataLabelFontFace: "+mn-lt", dataLabelFormatCode: "0.0",
    showTitle: true, title: "Mission fit, 0 to 100 (2027)", titleColor: "E6EAEF", titleFontSize: 14, titleFontFace: "+mn-lt",
  });
  const cards = [
    ["BALANCED · EVERY NEED “IMPORTANT”", `Peak near Shackleton  ${score("default", "Peak near Shackleton").toFixed(1)} vs ${score("default", "Connecting ridge").toFixed(1)}`, "Clear lead. The pick holds under all 6 one-step changes to the priorities."],
    ["ONLY LANDING SAFETY MATTERS", `Malapert massif  ${score("landing_only", "Malapert massif").toFixed(1)} vs ${score("landing_only", "Peak near Shackleton").toFixed(1)}`, "Narrow lead: the smoothest ground wins when sunlight and Earth do not count."],
    ["HARD LIMIT: SLOPE UNDER 5°", "Peak near Shackleton, the only option", `Malapert massif (p95 slope ${MP.slope_p95_deg.toFixed(1)}°) and Connecting ridge (${CR.slope_p95_deg.toFixed(1)}°) are excluded, with the reason.`],
  ];
  cards.forEach((c, i) => {
    const y = 1.5 + i * 1.42;
    box(s, 7.3, y, 5.43, 1.3, { name: `res-card-${i}` });
    mono(s, c[0], { x: 7.55, y: y + 0.13, w: 5.0, h: 0.24, fontSize: 11.5, objectName: `res-label-${i}` });
    T(s, c[1], { x: 7.55, y: y + 0.4, w: 5.0, h: 0.34, fontSize: 18.5, bold: true, objectName: `res-main-${i}` });
    T(s, c[2], { x: 7.55, y: y + 0.76, w: 5.0, h: 0.5, fontSize: 15, color: MUTED, objectName: `res-detail-${i}` });
    step(9, "click", [`res-card-${i}`, `res-label-${i}`, `res-main-${i}`, `res-detail-${i}`], 0, 500);
  });
  chip(s, "ASSUMED", MX, 5.98, { color: CAUTION, dashed: true, w: 1.3 });
  T(s, "Scores use fixed scales that are our assumptions: slope 0 at 20°, roughness 0 at 1 m RMS, darkness and outage 0 at one synodic month (29.5 d). Not yet reviewed by lander engineers.", { x: 2.1, y: 5.95, w: 7.5, h: 0.9, fontSize: 14.5, color: MUTED });
  addNotes(s, 9);
}

// =====================================================================================
// 10  DEMO
// =====================================================================================
pres.addSection({ title: "Demo" });
{
  const demoPath = team.demo_video ? path.join(ROOT, team.demo_video) : "";
  if (demoPath && fs.existsSync(demoPath)) {
    const s = slide("SCREEN", "Demo", "Live demo");
    s.addMedia({ type: "video", path: demoPath, x: 0, y: 0, w: W, h: H, cover: IMG("overview.jpg"), objectName: "demo-video" });
    addNotes(s, 10);
  } else {
    const s = slide("CONTENT", "Demo", "Live demo: from the Moon to one recommended site");
    chip(s, "DEMO", 11.45, 0.55, { w: 1.28, color: FG });
    const film = [
      ["overview-thumb.jpg", "OVERVIEW", "27 cited sites, lit by the real SPICE Sun"],
      ["illumination-thumb.jpg", "ILLUMINATION", "Hour by hour: sunlight and Earth line of sight"],
      ["terrain-thumb.jpg", "TERRAIN", "Slope and roughness from the 20 m LOLA DEM"],
      ["compare-thumb.jpg", "COMPARE", "Say what the mission needs, and its limits"],
      ["compare-slope5-thumb.jpg", "COMPARE", "One recommended site, with the reasons shown"],
      ["data-thumb.jpg", "DATA", "Every number traces to a NASA source"],
    ];
    film.forEach((f, i) => {
      const tw = 1.92, x = MX + i * (tw + 0.122);
      s.addImage({ path: IMG(f[0]), x, y: 1.5, w: tw, h: tw * 0.5625, altText: `${f[1]} page of LUNARSEYE`, objectName: `film-${i}` });
      frame(s, x, 1.5, tw, tw * 0.5625);
      mono(s, `${i + 1}  ${f[1]}`, { x, y: 2.68, w: tw, h: 0.26, fontSize: 12, bold: true, charSpacing: 0.5 });
      T(s, f[2], { x, y: 2.98, w: tw, h: 1.1, fontSize: 15, color: MUTED });
    });
    mono(s, "TRY IT LIVE", { x: MX, y: 4.4, w: 3, h: 0.26, bold: true });
    T(s, team.url, { x: MX, y: 4.72, w: 7.2, h: 0.7, fontSize: 36, bold: true });
    T(s, "Pick a site. Press Play. Answer three questions on Compare. Click any number to see its evidence.", { x: MX, y: 5.5, w: 7.0, h: 0.8, fontSize: 18, color: MUTED });
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 8.0, y: 4.15, w: 1.55, h: 1.55, rectRadius: 0.06, fill: { color: "E6EAEF" }, line: { color: "E6EAEF", width: 0 } });
    s.addImage({ path: IMG("qr-live.png"), x: 8.1, y: 4.25, w: 1.35, h: 1.35, altText: `QR code that opens ${team.url}`, objectName: "qr" });
    addNotes(s, 10);
  }
}

// =====================================================================================
// 11  TEAM
// =====================================================================================
pres.addSection({ title: "Team and process" });
{
  const s = slide("CONTENT", "Team and process", "Who did what");
  const n = team.members.length, gap = 0.3, cw = (12.13 - gap * (n - 1)) / n;
  team.members.forEach((m, i) => {
    const x = MX + i * (cw + gap), y = 1.55;
    box(s, x, y, cw, 4.3, { name: `member-${i}` });
    const d = 1.7, px = x + 0.35, py = y + 0.4;
    const photo = m.photo ? path.join(ROOT, m.photo) : "";
    if (photo && fs.existsSync(photo)) s.addImage({ path: photo, x: px, y: py, w: d, h: d, rounding: true, altText: `Photo of ${m.name}` });
    else {
      s.addShape(SH.OVAL, { x: px, y: py, w: d, h: d, line: { color: CAUTION, width: 1.25, dashType: "dash" } });
      mono(s, "PHOTO", { x: px, y: py + d / 2 - 0.12, w: d, h: 0.24, align: "center", color: CAUTION, bold: true });
    }
    T(s, m.name, { x: x + 2.3, y: y + 0.42, w: cw - 2.55, h: 0.85, fontSize: 23.5, bold: true });
    mono(s, m.role.toUpperCase(), { x: x + 2.3, y: y + 1.32, w: cw - 2.55, h: 0.5, color: isPH(m.role) ? CAUTION : MUTED, bold: true });
    T(s, m.responsible_for.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, color: phColor(t), breakLine: k < m.responsible_for.length - 1, paraSpaceAfter: 6 } })), { x: x + 0.35, y: y + 2.35, w: cw - 0.7, h: 1.8, fontSize: 18 });
  });
  addNotes(s, 11);
}

// =====================================================================================
// 12  PROCESS
// =====================================================================================
{
  const s = slide("CONTENT", "Team and process", "How we built it: the public git history");
  const log = [
    ["14 NOV", "Phase 1", "One end-to-end path, from a cited site to an evidence-backed timeline"],
    ["14 NOV", "Illumination page", "Sky chart, terrain-vs-flat tables, sunlight and Earth windows"],
    ["14 NOV", "Terrain page", "South pole lit by the SPICE Sun; 20 m slope and roughness"],
    ["14 NOV", "Compare", "Mission questions and one recommended site, with reasons"],
    ["14 NOV", "Live deployment", "Hosted online, database on Neon, Data page added"],
    ["14 NOV", "Interface audit", "One palette, accessible states, phone layout"],
  ];
  log.forEach((l, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = MX + col * 4.1, y = 1.5 + row * 1.7;
    box(s, x, y, 3.95, 1.55, { name: `log-${i}` });
    mono(s, l[0], { x: x + 0.28, y: y + 0.16, w: 2, h: 0.26, color: MUTED });
    T(s, l[1], { x: x + 0.28, y: y + 0.45, w: 3.4, h: 0.4, fontSize: 21, bold: true });
    T(s, l[2], { x: x + 0.28, y: y + 0.85, w: 3.4, h: 0.65, fontSize: 15.5, color: MUTED });
  });
  mono(s, "THE TEAM AT WORK", { x: MX, y: 5.0, w: 4, h: 0.26 });
  photo(s, "work-1.jpg", MX, 5.35, 1.45, "Our planning board on a tablet: data verification, the Compare page and the scoring idea");
  photo(s, "work-2.jpg", MX + 1.6, 5.35, 1.45, "One of us at the desk with the monitor and the planning board on a tablet");
  addNotes(s, 12);
}

// =====================================================================================
// 13  LIMITS AND NEXT
// =====================================================================================
pres.addSection({ title: "Close" });
{
  const s = slide("CONTENT", "Close", "What it is, and what it is not yet");
  box(s, MX, 1.5, 6.1, 3.3, { name: "limits-panel" });
  mono(s, "HONEST LIMITS", { x: MX + 0.3, y: 1.72, w: 4, h: 0.26, color: CAUTION, bold: true });
  const lim = [
    "Decision support, not a mission decision",
    "Coordinates are DEM tile centres, not landing points",
    "Earth visibility is line of sight, not a radio link",
    "Scales are our assumptions, not reviewed by lander engineers",
    "Site list is NASA’s 2022 set; NASA updated it to nine regions in Oct 2024 and has named no landing site",
  ];
  T(s, lim.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < lim.length - 1, paraSpaceAfter: 6 } })), { x: MX + 0.3, y: 2.15, w: 5.55, h: 3.2, fontSize: 18 });
  box(s, 6.95, 1.5, 5.78, 3.3, { name: "next-panel" });
  mono(s, "NEXT", { x: 7.25, y: 1.72, w: 4, h: 0.26, color: OK, bold: true });
  const nxt = ["Expert review of the weights and scales", "Update to NASA’s current candidate regions", "10 m and 5 m terrain for every site", "Solar-energy and thermal estimates"];
  T(s, nxt.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < nxt.length - 1, paraSpaceAfter: 6 } })), { x: 7.25, y: 2.15, w: 5.2, h: 3.2, fontSize: 18 });
  T(s, "Built to make a landing-site screening transparent: every number, source and assumption in view.", { x: MX, y: 5.2, w: 6.1, h: 1.4, fontSize: 20 });
  mono(s, "THE TEAM AT WORK", { x: 7.0, y: 4.95, w: 2.7, h: 0.26 });
  photo(s, "work-3.jpg", 7.0, 5.25, 1.3, "A desk with a laptop, a monitor and a tablet showing code");
  photo(s, "work-4.jpg", 8.4, 5.25, 1.3, "A teammate at his desk giving a thumbs up, laptop and monitor behind him");
  addNotes(s, 13);
}

// =====================================================================================
// 14  END CARD
// =====================================================================================
{
  const s = slide("END", "Close", "LUNARSEYE");
  s.addImage({ path: IMG("hero-dim.jpg"), x: 0, y: 0, w: W, h: H, altText: "The Moon, dimmed", objectName: "end-bg" });
  s.addShape(SH.RECTANGLE, { x: 0, y: 0, w: W, h: H, fill: { color: BG, transparency: 45 }, line: { color: BG, width: 0 }, objectName: "end-dim" });
  s._title(); // after the background so it sits on top
  T(s, "lunar south-pole site analysis", { x: 2.2, y: 2.85, w: 8.93, h: 0.4, fontFace: MONO, fontSize: 17.5, color: FGPRESS, align: "center", charSpacing: 2, objectName: "end-sub" });
  const names = team.members.map((m) => m.name).join(", ");
  T(s, [
    { text: `TEAM ${team.team_name.toUpperCase()}`, options: { breakLine: true, bold: true } },
    { text: `PROJECT BY  ${names}`, options: { breakLine: true } },
    { text: `${team.event}  /  ${team.url}`, options: { breakLine: true } },
    { text: "Independent project. Not endorsed by NASA.", options: { color: MUTED } },
  ], { x: 1.7, y: 6.3, w: 9.9, h: 0.85, fontFace: MONO, fontSize: 13, color: FGPRESS, align: "center", charSpacing: 1, objectName: "end-credits" });
  step(14, "auto", ["title-14"], 300, 1300);
  step(14, "auto", ["end-sub"], 350, 800);
  step(14, "auto", ["end-credits"], 350, 800);
  addNotes(s, 14);
}

// =====================================================================================
// APPENDIX
// =====================================================================================
pres.addSection({ title: "Appendix" });
{
  // A1 references
  const s = slide("CONTENT", "Appendix", "Appendix: data credits and references");
  const refs = [
    ["LOLA elevation", "Smith, D. E., et al. (2010). Space Science Reviews, 150, 209–241. doi:10.1007/s11214-009-9512-y. LDEM_75S_240M, NASA PDS Geosciences Node."],
    ["20 m south-pole DEM", "Barker, M. K., et al. (2023). The Planetary Science Journal, 4, 183. doi:10.3847/PSJ/acf3e1. Data: doi:10.60903/gsfcpgda-lola-spole (NASA GSFC PGDA product 90)."],
    ["5 m site DEMs", "Barker, M. K., et al. (2021). Planetary and Space Science, 203, 105119. doi:10.1016/j.pss.2020.105119 (PGDA product 78)."],
    ["Illumination maps", "Mazarico, E., et al. (2011). Icarus, 211(2), 1066–1081. doi:10.1016/j.icarus.2010.10.030."],
    ["SPICE and DE440", "Acton, C. H. (1996). Planetary and Space Science, 44(1), 65–70. Park, R. S., et al. (2021). The Astronomical Journal, 161(3), 105. doi:10.3847/1538-3881/abd414."],
    ["Moon colour map", "NASA's Scientific Visualization Studio. CGI Moon Kit, SVS 4720. Used for the globe picture only."],
    ["Candidate regions", "NASA news release, 19 Aug 2022 (13 regions); SVS 5013. NASA update, 28 Oct 2024 (nine regions)."],
    ["Reference ephemeris", "NASA JPL Solar System Dynamics, Horizons system (ssd.jpl.nasa.gov/horizons)."],
  ];
  refs.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = MX + col * 6.2, y = 1.5 + row * 1.2;
    T(s, [{ text: r[0], options: { bold: true, fontSize: 14.5, breakLine: true } }, { text: r[1], options: { fontSize: 12, color: MUTED } }], { x, y, w: 5.9, h: 1.1 });
  });
  T(s, "LUNARSEYE is an independent project. It is not endorsed by NASA, and no NASA logos are used. NASA data credit: NASA / JPL / GSFC / PDS / PGDA / NAIF / SVS.", { x: MX, y: 6.4, w: 11.5, h: 0.5, fontSize: 13, color: FGPRESS });
  addNotes(s, 0);
}
{
  // A2 compare scales
  const s = slide("CONTENT", "Appendix", "Appendix: Compare weights and fixed scales");
  const parsed = results.reference_scales.map((t) => { const m = t.match(/^weight (.+?) = ([0-9.]+); scale: (.*)$/); return m ? [m[1], (parseFloat(m[2]) * 100).toFixed(1) + " %", m[3]] : null; }).filter(Boolean);
  const head = (t) => ({ text: t, options: { bold: true, color: "8D97A6", fontFace: MONO, fontSize: 11.5, fill: { color: "10151C" } } });
  const rows = [[head("MEASURE"), head("WEIGHT"), head("SCALE (SCORE 1 → 0)")]];
  parsed.forEach((p) => rows.push([{ text: p[0], options: { bold: true } }, { text: p[1], options: { fontFace: MONO } }, { text: p[2], options: { color: "C3CBD6" } }]));
  s.addTable(rows, { x: MX, y: 1.5, w: 12.13, colW: [3.2, 1.3, 7.63], fontFace: SANS, fontSize: 13.5, color: "E6EAEF", border: { type: "solid", color: "1C232D", pt: 0.75 }, rowH: 0.42, valign: "middle", margin: [0.04, 0.1, 0.04, 0.1] });
  T(s, "Weights shown for the default mission (all three needs “Important”). Priorities map to weights 0 / 1 / 2 / 4 for not needed / nice to have / important / critical, normalised to sum to 1. A site over a hard limit is excluded before any scoring. Every weight and scale is ASSUMED: it was chosen by looking at the 27 catalogue sites in 2027 and has not been reviewed against a real lander.", { x: MX, y: 5.5, w: 9.0, h: 1.3, fontSize: 13.5, color: MUTED });
  addNotes(s, 0);
}
{
  // A3 architecture
  const s = slide("CONTENT", "Appendix", "Appendix: how the pieces fit");
  const nodes = [["NASA ARCHIVES", "PDS · PGDA · NAIF · SVS · JPL"], ["DATA LAYER", "acquire · verify SHA-256 · read remote windows"], ["SCIENCE CORE", "SPICE geometry · terrain horizon · slope · evidence model"], ["API", "FastAPI · PostgreSQL · per-site cache"], ["WEB", "Next.js · three.js · 5 pages"]];
  const nw = 2.2, ng = 0.28;
  nodes.forEach((n, i) => {
    const x = MX + i * (nw + ng);
    s.addText([{ text: n[0], options: { fontFace: MONO, fontSize: 11.5, bold: true, color: "8D97A6", charSpacing: 1.5, breakLine: true } }, { text: n[1], options: { fontSize: 14.5, color: "E6EAEF" } }], { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y: 2.3, w: nw, h: 1.7, fill: { color: PANEL }, line: { color: LINE2, width: 1 }, margin: [8, 11, 8, 11], valign: "middle" });
    if (i < nodes.length - 1) s.addShape(SH.RIGHT_ARROW, { x: x + nw + 0.03, y: 2.98, w: ng - 0.06, h: 0.3, fill: { color: CTRL }, line: { color: CTRL, width: 0 } });
  });
  T(s, "Rules the code follows: evidence on every number; a value that cannot be computed is null with a reason, never 0; thresholds, weights and scales are labelled assumptions; Sun and Earth numbers use the terrain horizon (the flat horizon is reported beside it).", { x: MX, y: 4.5, w: 9.0, h: 1.2, fontSize: 16.5, color: MUTED });
  addNotes(s, 0);
}
{
  // A4 Q&A backup
  const s = slide("CONTENT", "Appendix", "Appendix: questions we expect");
  const qa = narr.qa.slice(0, 6);
  qa.forEach((q, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = MX + col * 6.2, y = 1.45 + row * 1.75;
    T(s, [{ text: q.q, options: { bold: true, fontSize: 14.5, breakLine: true } }, { text: q.a.length > 230 ? q.a.slice(0, q.a.lastIndexOf(" ", 230)) + " …" : q.a, options: { fontSize: 12, color: MUTED } }], { x, y, w: 5.9, h: 1.65 });
  });
  addNotes(s, 0);
}

// ---------- write ----------
(async () => {
  const file = path.join(OUT, "LUNARSEYE_deck_raw.pptx");
  await pres.writeFile({ fileName: file });
  await applyTheme(file, THEME);
  fs.writeFileSync(path.join(OUT, "builds.json"), JSON.stringify(builds, null, 1));
  console.log("wrote", file, "slides:", slideNo);
})();
