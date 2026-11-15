# LUNARSEYE: presentation script (English, about 5:58)

Slides: `LUNARSEYE_deck.pptx` (PDF backup: `LUNARSEYE_deck.pdf`). The same words are in the speaker notes of every slide.

**Speakers.** A = Thammapat Deesaysamongkol. B = Jinn Sawasdivorn. Swap A and B anywhere; keep each person's stretch continuous.

**Items to fill in before recording** (they are in square brackets and in orange on the slides): team name, challenge title, each member's role, who did what, and one personal sentence on the process slide. Edit `config/team.json` and `script/narration.js`, then rebuild.

## 1. Timing

| # | Slide | Speaker | Words | Seconds |
|---|---|---|---|---|
| 1 | Hook | Thammapat (A) | 36 | 0:18 |
| 2 | Problem | Thammapat (A) | 50 | 0:25 |
| 3 | What LUNARSEYE is | Jinn (B) | 37 | 0:19 |
| 4 | NASA data | Jinn (B) | 71 | 0:35 |
| 5 | Tools | Thammapat (A) | 50 | 0:25 |
| 6 | How the numbers are made | Thammapat (A) | 54 | 0:27 |
| 7 | Evidence and validation | Jinn (B) | 47 | 0:24 |
| 8 | Compare: how it decides | Thammapat (A) | 56 | 0:28 |
| 9 | Compare: three missions, three answers | Jinn (B) | 59 | 0:29 |
| 10 | Live demo | A and B | 100 (demo) | 1:01 |
| 11 | Team roles | Jinn (B) | 38 (incl. your words) | 0:19 |
| 12 | Process: photos and video | Thammapat (A) | 28 (incl. your words) | 0:14 |
| 13 | Honest limits and what's next | Jinn (B) | 51 | 0:25 |
| 14 | Thank you | A and B | 15 | 0:08 |
| | **Total** | | **692** | **5:58** |

Pace used: 125 words a minute plus 1 s per slide change. The demo is paced by its footage (1:00).

| If you speak at | Total video |
|---|---|
| 110 wpm | 6:37 |
| 125 wpm (planned) | 5:58 |
| 140 wpm | 5:28 |

Rules: 5 minutes is recommended, **7:00 is the hard maximum**. Aim to finish between 5:45 and 6:30. Do not slow down below about 100 words a minute: research on accented speech found that artificially slow speech is less comprehensible. If you run long, cut words, not speed (see the trim list).

## 2. Script, slide by slide

### Slide 1. Hook  
*Thammapat (A) · about 0:18 · 36 words*

- **Cue:** Slide builds by itself: question, then SUNLIGHT, EARTH LINE OF SIGHT, TERRAIN light up one by one.

> Where should we land at the Moon's south pole?
> Three things decide it: how long the Sun shines, whether Earth is in view, and how smooth the ground is.
> We are [TEAM NAME], and this is LUNARSEYE.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* เปิดด้วยคำถามว่าควรลงจอดที่ขั้วใต้ดวงจันทร์ตรงไหน ปัจจัยหลักสามอย่างคือแสงอาทิตย์ แนวมองเห็นโลก และความเรียบของพื้นผิว

### Slide 2. Problem  
*Thammapat (A) · about 0:25 · 50 words*

> Look at two candidate sites in 2027.
> Peak near Shackleton has direct sunlight 88 percent of the year; Malapert massif, only 46.
> Earth is in view 61 percent of the time, against 51.
> But Malapert has the smoother ground.
> Sites trade off, so the best site depends on the mission.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ตัวอย่างสองไซต์ในปี 2027: Peak near Shackleton ได้แสงอาทิตย์ 88% ส่วน Malapert massif 46% โลกมองเห็น 61% เทียบกับ 51% แต่ Malapert พื้นเรียบกว่า จึงต้องเลือกตามภารกิจ

### Slide 3. What LUNARSEYE is  
*Jinn (B) · about 0:19 · 37 words*

> LUNARSEYE brings these answers together.
> It covers 27 cited candidate sites on five pages: Overview, Illumination, Terrain, Compare and Data.
> Every number carries a tag that says what kind of evidence it is, and opens its source.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* LUNARSEYE รวมคำตอบไว้ที่เดียว: 27 ไซต์ 5 หน้า และทุกตัวเลขมีแท็กบอกประเภทหลักฐานและเปิดดูที่มาได้

### Slide 4. NASA data  
*Jinn (B) · about 0:35 · 71 words*

- **Cue:** [CLICK] once, after the list: the pipeline on the right appears.

> We use seven NASA data sources.
> LOLA terrain from the Lunar Reconnaissance Orbiter: 240 metres for the horizon, 20 metres for slope.
> SPICE and DE440 from NASA NAIF give the Sun and Earth direction every hour.
> PGDA tiles and NASA's candidate regions give the 27 sites.
> The Moon picture is visual only.
> JPL Horizons and published LOLA maps are how we check ourselves.
> Every file is pinned by its SHA-256 hash.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* เจ็ดแหล่งข้อมูลจาก NASA: LOLA (ภูมิประเทศ 240 ม. และ 20 ม.), SPICE/DE440 (ตำแหน่งดวงอาทิตย์และโลก), PGDA (รายชื่อไซต์), SVS (ภาพลูกโลกเท่านั้น), JPL Horizons และแผนที่ LOLA ที่เผยแพร่แล้ว (ไว้ตรวจสอบ) ทุกไฟล์ล็อกด้วย SHA-256

### Slide 5. Tools  
*Thammapat (A) · about 0:25 · 50 words*

> The science is Python: NumPy, SciPy, SpiceyPy and rasterio.
> FastAPI and PostgreSQL serve it, and the interface is Next.js with three.js.
> We wrote automated tests with pytest and Vitest.
> We also used an AI coding assistant, Claude Code, and we say so openly.
> Every result is checked against NASA references.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* เครื่องมือ: Python, FastAPI, PostgreSQL, Next.js, three.js และบอกตรง ๆ ว่าใช้ AI (Claude Code) ช่วยเขียนโค้ด โดยผลลัพธ์ทุกอย่างตรวจกับข้อมูลอ้างอิงของ NASA

### Slide 6. How the numbers are made  
*Thammapat (A) · about 0:27 · 54 words*

> For each site we build the terrain skyline from LOLA: 1,440 directions, out to 200 kilometres.
> SPICE gives the Sun and Earth positions every hour of 2027.
> If a body is above the skyline, it counts.
> That gives time in sunlight, longest darkness, and Earth line of sight: geometry only, not a radio link.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* วิธีคำนวณ: สร้างเส้นขอบฟ้าจากภูมิประเทศ 1,440 ทิศ ไกล 200 กม. แล้วใช้ SPICE หาตำแหน่งดวงอาทิตย์และโลกทุกชั่วโมงในปี 2027 ถ้าอยู่เหนือเส้นขอบฟ้าถือว่ามองเห็น (โลกคือแนวมองเห็นเชิงเรขาคณิต ไม่ใช่ลิงก์วิทยุ)

### Slide 7. Evidence and validation  
*Jinn (B) · about 0:24 · 47 words*

> Every value is tagged: observation, derived, model, calculation, assumed or placeholder.
> Click one and you see the source, the method, the limits and the file hash.
> We check our geometry against JPL Horizons, our sunlight against published LOLA maps, and our code with hundreds of automated tests.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ทุกค่ามีแท็กหลักฐาน คลิกเพื่อดูที่มา วิธีคำนวณ ข้อจำกัด และแฮชของไฟล์ เราตรวจกับ JPL Horizons แผนที่ LOLA ที่เผยแพร่ และชุดทดสอบอัตโนมัติหลายร้อยรายการ

### Slide 8. Compare: how it decides  
*Thammapat (A) · about 0:28 · 56 words*

- **Cue:** Step 1 is on screen. [CLICK] when you say 'Second'. [CLICK] when you say 'Third'.

> Now our key feature: Compare.
> First, you say what the mission needs, and any hard limits.
> Second, a site that breaks a limit is ruled out, with the reason, never just scored lower.
> Third, you get one recommended site, with its reasons and what it gives up.
> The scales behind the score are shown as assumptions.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* Compare (ฟีเจอร์เด่น): 1) บอกความต้องการของภารกิจและข้อจำกัดเด็ดขาด 2) ไซต์ที่ฝ่าฝืนข้อจำกัดจะถูกตัดออกพร้อมเหตุผล ไม่ใช่แค่ลดคะแนน 3) ได้ไซต์แนะนำหนึ่งแห่งพร้อมเหตุผลและสิ่งที่ต้องยอมเสีย สเกลคะแนนแสดงเป็นสมมติฐาน

### Slide 9. Compare: three missions, three answers  
*Jinn (B) · about 0:29 · 59 words*

- **Cue:** [CLICK] when you say 'Balanced'. [CLICK] on 'landing safety'. [CLICK] on 'five-degree slope limit'.

> Same three sites, three missions.
> Balanced: Peak near Shackleton wins, 71 to 58, and the pick holds under every one-step change.
> If only landing safety matters, Malapert massif wins, narrowly: 70.5 to 69.2.
> Set a five-degree slope limit, and the other two are excluded, with their slopes shown.
> Same data, different mission, different answer, and the tool shows why.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* สามภารกิจ สามคำตอบ: แบบสมดุล → Peak near Shackleton (71 ต่อ 58 และไม่เปลี่ยนเมื่อปรับลำดับความสำคัญหนึ่งขั้น), เน้นความปลอดภัยในการลงจอด → Malapert massif (70.5 ต่อ 69.2 ชนะเฉียดฉิว), จำกัดความชัน 5° → เหลือ Peak near Shackleton เพียงแห่งเดียว

### Slide 10. Live demo  
*A and B · about 1:01 · 100 words*

- **Cue:** Footage runs about 60 s: globe, Illumination, Terrain, Compare (three beats), Data. Say the lines at the marked times.
- **Cue:** Live version: switch to https://lunarseye.onrender.com (open it 2 minutes BEFORE; the free server needs ~45 s to wake).

| Footage time | Speaker | Say |
|---|---|---|
| 0:00 | Thammapat (A) | On the globe, 27 cited sites sit under the real SPICE Sun. We pick Peak near Shackleton. |
| 0:10 | Jinn (B) | Hour by hour: gold is sunlight, blue is Earth. The sky chart shows the terrain skyline. Where the Sun is below it, terrain blocks the light. |
| 0:22 | Thammapat (A) | Terrain uses the 20-metre LOLA model for slope and roughness. You enter your own thresholds. We ship no default safe value. |
| 0:32 | Jinn (B) | On Compare, we answer three questions, add a slope limit, and one site comes back with its reasons. Two sites are excluded, and the page says why. |
| 0:52 | Thammapat (A) | And Data lists every NASA file with its checksum. |

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* เดโม (ประมาณ 60 วินาที): ลูกโลก → Illumination → Terrain → Compare (ตอบคำถาม, ใส่ข้อจำกัดความชัน, ได้ไซต์แนะนำ) → Data

### Slide 11. Team roles  
*Jinn (B) · about 0:19 · 38 words*

- **Cue:** Fill the roles in config/team.json before recording; say in your own words who did what.

> We are a team of two.
> [MEMBER A: ROLE AND WHAT THEY BUILT.] [MEMBER B: ROLE AND WHAT THEY BUILT.] [ONE SENTENCE ON HOW YOU DECIDED AND CHECKED TOGETHER.]

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* แนะนำสมาชิกและหน้าที่ของแต่ละคน (กรอกใน config/team.json และพูดด้วยคำของตัวเอง)

### Slide 12. Process: photos and video  
*Thammapat (A) · about 0:14 · 28 words*

- **Cue:** Show your own photos or a short clip of the team at work in the slots on this slide.

> Our public commit history tells the story: first the end-to-end path, then Illumination, Terrain, Compare, a live deployment, and a full interface audit, with tests at every step.
> [ADD ONE PERSONAL SENTENCE ABOUT HOW YOU WORKED.]

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ประวัติ commit บอกเรื่องราวการพัฒนา: เส้นทางหลัก → Illumination → Terrain → Compare → deploy → ปรับ UI พร้อมแสดงภาพ/คลิปทีม

### Slide 13. Honest limits and what's next  
*Jinn (B) · about 0:25 · 51 words*

> LUNARSEYE is decision support, not a mission decision.
> Coordinates are tile centres, not landing points.
> Earth visibility is geometry, not a radio link.
> Our scales are assumptions that lander engineers should review, and our site list is NASA's 2022 one.
> Next: expert-reviewed scales, the current regions, finer terrain, and solar-energy estimates.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ข้อจำกัด: เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่การตัดสินใจภารกิจ; พิกัดคือจุดกึ่งกลางไทล์; โลกมองเห็นเชิงเรขาคณิตเท่านั้น; สเกลเป็นสมมติฐาน; รายชื่อไซต์เป็นของ NASA ปี 2022 ขั้นต่อไป: ให้ผู้เชี่ยวชาญทบทวนสเกล อัปเดตรายชื่อ ภูมิประเทศละเอียดขึ้น และประเมินพลังงานแสงอาทิตย์

### Slide 14. Thank you  
*A and B · about 0:08 · 15 words*

- **Cue:** Wordmark appears by itself. Both members on camera.

> Thank you.
> LUNARSEYE: lunar south-pole site analysis.
> Try it at lunarseye dot onrender dot com.

*ไทย (ไว้ซ้อม ไม่ต้องอ่านออกเสียง):* ขอบคุณ ลองใช้ได้ที่ lunarseye.onrender.com

## 3. Trim list (to reach about 5:30 or 5:00)

1. Slide 5 (Tools): keep only "Python, FastAPI, Next.js", the AI-assistant sentence, and "every result is checked against NASA references". **Never cut the AI disclosure.** (saves about 8 s)
2. Slide 4 (NASA data): drop the SVS sentence and the Horizons/LOLA-maps sentence into one: "Two more NASA sources are our checks." (saves about 12 s)
3. Slide 6 (Method): drop the last sentence about Earth being geometry only; it is also on slide 13. (saves about 6 s)
4. Slide 3: merge into slide 2: "LUNARSEYE has five pages and 27 sites; every number carries its evidence." (saves about 8 s)
5. Slide 12 (Process): say only the first clause. (saves about 8 s)
6. Demo footage: shorten the Illumination and Terrain beats by about 5 s each. (saves about 10 s)

Never cut: Compare slides 8 and 9 (the key feature), the AI disclosure, the honest limits (slide 13), and the credits on the end card.

## 4. Say it clearly: pronunciation and wording

| Word | Say it like | Note |
|---|---|---|
| Shackleton | SHAK-ul-ton | crater and ridge near the south pole |
| Malapert | MAL-uh-pert | pick one way and use it every time |
| Haworth | HOW-erth | only on the appendix slides |
| LOLA | LOH-luh | Lunar Orbiter Laser Altimeter |
| SPICE | spice | the word, like the food |
| NAIF | spell it: N-A-I-F | NASA's Navigation and Ancillary Information Facility |
| DE440 | D-E four-forty | |
| SHA-256 | S-H-A two-fifty-six | a file fingerprint |
| PGDA, SVS, LRO, PDS | spell the letters | |
| 2027 | twenty twenty-seven | |
| 71.3 | seventy-one point three | "71 to 58" in the narration is fine |

Tips: short sentences, one idea each. Pause one beat at every slide change. Look at the camera lens, not at your own face. If you stumble, stop, breathe, and repeat the whole sentence from its start (easier to edit).

## 5. Questions the judges may ask (and short answers)

Bangkok organiser criteria (third-party event page, confirm with the organiser): usefulness, relevance, potential for further development, presentation skills, answering questions. Space Apps global criteria: Impact, Creativity, Validity, Relevance, Presentation. Keep each answer under 30 seconds; do not read these aloud, answer in your own words.

**Q1. Why should we trust the recommendation?**  
*Criterion:* Validity  
Treat it as decision support. Hard limits are applied first, and a site that breaks one is excluded with the reason. Weights and scales are labelled ASSUMED and shown in full. The pick is re-run with every priority moved one step, and the page says whether it flips. Every number opens its source and method. The scales have not yet been reviewed by lander engineers, and we say so.

**Q2. Which NASA data did you use, and for what?**  
*Criterion:* Relevance  
Seven sources: LOLA terrain at 240 m (horizon) and 20 m (slope, roughness) via NASA PDS and PGDA; SPICE and DE440 from NAIF for Sun and Earth geometry; PGDA site tiles and NASA's candidate regions for the 27 sites; the SVS Moon Kit for the globe picture only; JPL Horizons and published LOLA illumination maps for validation. Each file's URL, size and SHA-256 are recorded.

**Q3. How did you validate the results?**  
*Criterion:* Validity  
Sun and Earth angles are compared with JPL Horizons (test tolerance 0.01 arc-second). Sunlight and Earth visibility are compared with the published LOLA maps by Mazarico et al. (tolerance 0.05, largest measured difference 0.042). The published maps use another period and DEM, so they are a sanity check, not an identical comparison. There are also hundreds of unit and API tests.

**Q4. Is Earth visibility the same as having a communication link?**  
*Criterion:* Validity  
No. It is geometric line of sight above the terrain horizon. Link budget, antennas, ground stations and multipath are not modelled, and the page says so.

**Q5. Are these landing sites?**  
*Criterion:* Validity  
No. Each coordinate is the centre of a PGDA 5 m DEM tile for a candidate region, not a selected landing point. NASA describes its regions as about 15 km across and a landing site as about 100 m.

**Q6. NASA changed its candidate regions. Is your list current?**  
*Criterion:* Relevance / Validity  
Our catalogue uses NASA's 2022 list of 13 regions. NASA published an updated set of nine regions in October 2024, and, as far as we found, has named no landing site since; its pages say the first landing is now planned for Artemis IV in 2028 at the lunar south pole. Updating the catalogue is on our next-steps list. [Re-check NASA's Artemis pages before you speak.]

**Q7. What AI did you use, and how?**  
*Criterion:* Presentation (AI disclosure)  
We used Claude Code (Anthropic) as a coding assistant, and we disclose it. Results are checked by automated tests and NASA references, not by the assistant. [Say who defined the problem and chose the approach; Space Apps asks that AI is not used to come up with the idea.]

**Q8. Why does a run say '≥' (for example 'longest sunlit run ≥ 130 d')?**  
*Criterion:* Validity  
A run that touches the edge of the analysis window may have started earlier or continue later, so its length is only a lower bound. We mark it instead of presenting it as exact.

**Q9. How do you handle slope and roughness?**  
*Criterion:* Validity  
From the PGDA 20 m DEM: slope at the site and the 95th percentile over a 50 m footprint (40 m baseline), and RMS roughness (100 m baseline). Thresholds are entered by the user; we ship no default 'safe' value. NASA's own lander tilt limit and terrain screens are different numbers, so we do not claim a pass or fail.

**Q10. What would you do next?**  
*Criterion:* Potential for further development  
Have domain experts review the scales, update the site list to NASA's current regions, add finer terrain (10 m and 5 m) for every site, and add solar-energy and thermal estimates, which are not scored today.

**Q11. Is it fast enough to use?**  
*Criterion:* Usefulness  
Default timelines for all 27 sites are pre-computed when the service is built, so a comparison of ten sites returns in about two seconds on the free hosting we use; the first request after a long idle takes about 45 seconds while the server wakes.

## 6. Rehearsal checklist

- [ ] Read the whole script aloud twice with a stopwatch. Target 5:45 to 6:30, never over 6:45.
- [ ] Practise every [CLICK] cue with the deck in presentation mode.
- [ ] Open https://lunarseye.onrender.com **two minutes before** any live demo (the free server needs about 45 seconds to wake up), then click Compare once so the data is warm.
- [ ] Check that every number you say matches the slide (88 and 46 percent; 61 and 51 percent; 71 to 58; 70.5 to 69.2; 5.5 and 7.3 degrees).
- [ ] Say the AI-assistance sentence in your own words and be ready for the question "who had the idea?" (Space Apps asks that AI is not used to come up with the idea).
- [ ] Fill in or remove every [bracket] in the script and every orange placeholder on the slides.
