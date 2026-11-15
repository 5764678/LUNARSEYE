// Generates script/LUNARSEYE_script.md (the full rehearsal script) and script/transcript_for_captions.txt
// from script/narration.js + config/team.json.   Usage (from submission/):  node build/make_script.js
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const narr = require(path.join(ROOT, "script/narration.js"));
const team = JSON.parse(fs.readFileSync(path.join(ROOT, "config/team.json"), "utf8"));

const nameOf = (who) => {
  const f = (m) => (m ? m.name.split(" ")[0] : "?");
  if (who === "A") return `${f(team.members[0])} (A)`;
  if (who === "B") return `${f(team.members[1] || team.members[0])} (B)`;
  return who;
};
const words = (t) => t.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean).length;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const rep = (t) => t.replace("[TEAM NAME]", team.team_name);

// ---- timing ----
const rows = narr.slides.map((e) => {
  const w = e.beats ? e.beats.reduce((a, b) => a + words(b.text), 0) : words(e.text) + (e.fillWords || 0);
  const speak = e.fixedSeconds ?? (w / narr.wpm) * 60;
  return { e, w, secs: speak + narr.pauseSeconds };
});
const total = rows.reduce((a, r) => a + r.secs, 0);
const totalWords = rows.reduce((a, r) => a + r.w, 0);
const demoWords = rows.filter((r) => r.e.fixedSeconds).reduce((a, r) => a + r.w, 0);
const talkWords = totalWords - demoWords;
const demoSecs = rows.filter((r) => r.e.fixedSeconds).reduce((a, r) => a + r.e.fixedSeconds + narr.pauseSeconds, 0);
const at = (wpm) => (talkWords / wpm) * 60 + demoSecs + (rows.length - 1) * narr.pauseSeconds;

let md = "";
md += `# LUNARSEYE: presentation script (English, about ${mmss(total)})\n\n`;
md += `Slides: \`LUNARSEYE_deck.pptx\` (PDF backup: \`LUNARSEYE_deck.pdf\`). The same words are in the speaker notes of every slide.\n\n`;
md += `**Speakers.** A = ${team.members[0].name}. B = ${team.members[1] ? team.members[1].name : "(second member)"}. Swap A and B anywhere; keep each person's stretch continuous.\n\n`;
md += `**Items to fill in before recording** (they are in square brackets and in orange on the slides): team name, challenge title, each member's role, who did what, and one personal sentence on the process slide. Edit \`config/team.json\` and \`script/narration.js\`, then rebuild.\n\n`;

md += `## 1. Timing\n\n`;
md += `| # | Slide | Speaker | Words | Seconds |\n|---|---|---|---|---|\n`;
rows.forEach((r) => { md += `| ${r.e.n} | ${r.e.title} | ${nameOf(r.e.who)} | ${r.e.beats ? r.w + " (demo)" : r.w + (r.e.fillIn ? " (incl. your words)" : "")} | ${mmss(r.secs)} |\n`; });
md += `| | **Total** | | **${totalWords}** | **${mmss(total)}** |\n\n`;
md += `Pace used: ${narr.wpm} words a minute plus ${narr.pauseSeconds} s per slide change. The demo is paced by its footage (${mmss(rows.find((r) => r.e.fixedSeconds).e.fixedSeconds)}).\n\n`;
md += `| If you speak at | Total video |\n|---|---|\n| 110 wpm | ${mmss(at(110))} |\n| 125 wpm (planned) | ${mmss(at(125))} |\n| 140 wpm | ${mmss(at(140))} |\n\n`;
md += `Rules: 5 minutes is recommended, **7:00 is the hard maximum**. Aim to finish between 5:45 and 6:30. Do not slow down below about 100 words a minute: research on accented speech found that artificially slow speech is less comprehensible. If you run long, cut words, not speed (see the trim list).\n\n`;

md += `## 2. Script, slide by slide\n\n`;
rows.forEach(({ e, w, secs }) => {
  md += `### Slide ${e.n}. ${e.title}  \n`;
  md += `*${nameOf(e.who)} · about ${mmss(secs)} · ${w} words*\n\n`;
  if (e.cues && e.cues.length) md += e.cues.map((c) => `- **Cue:** ${c}`).join("\n") + "\n\n";
  if (e.beats) {
    md += `| Footage time | Speaker | Say |\n|---|---|---|\n`;
    e.beats.forEach((b) => { md += `| ${b.at} | ${nameOf(b.who)} | ${b.text} |\n`; });
    md += "\n";
  } else {
    md += rep(e.text).split(/(?<=[.?!])\s+/).map((s) => `> ${s}`).join("\n") + "\n\n";
  }
  md += `*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ${e.thai}\n\n`;
});

md += `## 3. Trim list (to reach about 5:30 or 5:00)\n\n`;
md += `1. Slide 5 (Tools): keep only "Python, FastAPI, Next.js", the AI-assistant sentence, and "every result is checked against NASA references". **Never cut the AI disclosure.** (saves about 8 s)\n`;
md += `2. Slide 4 (NASA data): drop the SVS sentence and the Horizons/LOLA-maps sentence into one: "Two more NASA sources are our checks." (saves about 12 s)\n`;
md += `3. Slide 6 (Method): drop the last sentence about Earth being geometry only; it is also on slide 13. (saves about 6 s)\n`;
md += `4. Slide 3: merge into slide 2: "LUNARSEYE has five pages and 27 sites; every number carries its evidence." (saves about 8 s)\n`;
md += `5. Slide 12 (Process): say only the first clause. (saves about 8 s)\n`;
md += `6. Demo footage: shorten the Illumination and Terrain beats by about 5 s each. (saves about 10 s)\n\n`;
md += `Never cut: Compare slides 8 and 9 (the key feature), the AI disclosure, the honest limits (slide 13), and the credits on the end card.\n\n`;

md += `## 4. Say it clearly: pronunciation and wording\n\n`;
md += `| Word | Say it like | Note |\n|---|---|---|\n`;
md += `| Shackleton | SHAK-ul-ton | crater and ridge near the south pole |\n`;
md += `| Malapert | MAL-uh-pert | pick one way and use it every time |\n`;
md += `| Haworth | HOW-erth | only on the appendix slides |\n`;
md += `| LOLA | LOH-luh | Lunar Orbiter Laser Altimeter |\n`;
md += `| SPICE | spice | the word, like the food |\n`;
md += `| NAIF | spell it: N-A-I-F | NASA's Navigation and Ancillary Information Facility |\n`;
md += `| DE440 | D-E four-forty | |\n`;
md += `| SHA-256 | S-H-A two-fifty-six | a file fingerprint |\n`;
md += `| PGDA, SVS, LRO, PDS | spell the letters | |\n`;
md += `| 2027 | twenty twenty-seven | |\n`;
md += `| 71.3 | seventy-one point three | "71 to 58" in the narration is fine |\n\n`;
md += `Tips: short sentences, one idea each. Pause one beat at every slide change. Look at the camera lens, not at your own face. If you stumble, stop, breathe, and repeat the whole sentence from its start (easier to edit).\n\n`;

md += `## 5. Questions the judges may ask (and short answers)\n\n`;
md += `Bangkok organiser criteria (third-party event page, confirm with the organiser): usefulness, relevance, potential for further development, presentation skills, answering questions. Space Apps global criteria: Impact, Creativity, Validity, Relevance, Presentation. Keep each answer under 30 seconds; do not read these aloud, answer in your own words.\n\n`;
const crit = ["Validity", "Relevance", "Validity", "Validity", "Validity", "Relevance / Validity", "Presentation (AI disclosure)", "Validity", "Validity", "Potential for further development", "Usefulness"];
narr.qa.forEach((q, i) => {
  md += `**Q${i + 1}. ${q.q}**  \n*Criterion:* ${crit[i] || ""}  \n${q.a}\n\n`;
});

md += `## 6. Rehearsal checklist\n\n`;
md += `- [ ] Read the whole script aloud twice with a stopwatch. Target 5:45 to 6:30, never over 6:45.\n`;
md += `- [ ] Practise every [CLICK] cue with the deck in presentation mode.\n`;
md += `- [ ] Open https://lunarseye.onrender.com **two minutes before** any live demo (the free server needs about 45 seconds to wake up), then click Compare once so the data is warm.\n`;
md += `- [ ] Check that every number you say matches the slide (88 and 46 percent; 61 and 51 percent; 71 to 58; 70.5 to 69.2; 5.5 and 7.3 degrees).\n`;
md += `- [ ] Say the AI-assistance sentence in your own words and be ready for the question "who had the idea?" (Space Apps asks that AI is not used to come up with the idea).\n`;
md += `- [ ] Fill in or remove every [bracket] in the script and every orange placeholder on the slides.\n`;
fs.writeFileSync(path.join(ROOT, "script/LUNARSEYE_script.md"), md);

// plain read-aloud transcript: one sentence per line (use it for YouTube "auto-sync" captions or Whisper)
let tx = "";
narr.slides.forEach((e) => {
  const body = e.beats ? e.beats.map((b) => b.text).join(" ") : e.text;
  tx += rep(body).replace(/\[[^\]]*\]/g, "").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean).join("\n") + "\n";
});
fs.writeFileSync(path.join(ROOT, "script/transcript_for_captions.txt"), tx);
console.log(`script written: ${totalWords} words, about ${mmss(total)} (110 wpm ${mmss(at(110))}, 140 wpm ${mmss(at(140))})`);
