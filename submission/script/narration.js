// Single source for the spoken script. build_deck.js puts `text` into each slide's speaker notes;
// make_script.js turns this file into script/LUNARSEYE_script.md (timings, word counts, Thai gist, Q&A).
// Edit the words here, then re-run:  node build/build_deck.js && node build/make_script.js
//
// Speakers: "A" = members[0] and "B" = members[1] in config/team.json.
// `fixedSeconds` = slide time is set by footage/animation, not by word count (demo).
// Square brackets in `text` are things to FILL IN or CUES; they are not read aloud and not counted.

module.exports = {
  wpm: 125, // research: 110-130 wpm suits non-native speakers; do not slow below ~100 wpm (less comprehensible)
  pauseSeconds: 1.0, // breathing / slide-change pause added per slide
  slides: [
    {
      n: 1, id: "hook", title: "Hook", who: "A",
      cues: ["Slide builds by itself: question, then SUNLIGHT, EARTH LINE OF SIGHT, TERRAIN light up one by one."],
      text: "Where should we land at the Moon's south pole? Three things decide it: how long the Sun shines, whether Earth is in view, and how smooth the ground is. We are [TEAM NAME], and this is LUNARSEYE.",
      thai: "เปิดด้วยคำถามว่าควรลงจอดที่ขั้วใต้ดวงจันทร์ตรงไหน ปัจจัยหลักสามอย่างคือแสงอาทิตย์ แนวมองเห็นโลก และความเรียบของพื้นผิว",
    },
    {
      n: 2, id: "problem", title: "Problem", who: "A",
      cues: [],
      text: "Look at two candidate sites in 2027. Peak near Shackleton has direct sunlight 88 percent of the year; Malapert massif, only 46. Earth is in view 61 percent of the time, against 51. But Malapert has the smoother ground. Sites trade off, so the best site depends on the mission.",
      thai: "ตัวอย่างสองไซต์ในปี 2027: Peak near Shackleton ได้แสงอาทิตย์ 88% ส่วน Malapert massif 46% โลกมองเห็น 61% เทียบกับ 51% แต่ Malapert พื้นเรียบกว่า จึงต้องเลือกตามภารกิจ",
    },
    {
      n: 3, id: "what", title: "What LUNARSEYE is", who: "B",
      cues: [],
      text: "LUNARSEYE brings these answers together. It covers 27 cited candidate sites on five pages: Overview, Illumination, Terrain, Compare and Data. Every number carries a tag that says what kind of evidence it is, and opens its source.",
      thai: "LUNARSEYE รวมคำตอบไว้ที่เดียว: 27 ไซต์ 5 หน้า และทุกตัวเลขมีแท็กบอกประเภทหลักฐานและเปิดดูที่มาได้",
    },
    {
      n: 4, id: "data", title: "NASA data", who: "B",
      cues: ["[CLICK] once, after the list: the pipeline on the right appears."],
      text: "We use seven NASA data sources. LOLA terrain from the Lunar Reconnaissance Orbiter: 240 metres for the horizon, 20 metres for slope. SPICE and DE440 from NASA NAIF give the Sun and Earth direction every hour. PGDA tiles and NASA's candidate regions give the 27 sites. The Moon picture is visual only. JPL Horizons and published LOLA maps are how we check ourselves. Every file is pinned by its SHA-256 hash.",
      thai: "เจ็ดแหล่งข้อมูลจาก NASA: LOLA (ภูมิประเทศ 240 ม. และ 20 ม.), SPICE/DE440 (ตำแหน่งดวงอาทิตย์และโลก), PGDA (รายชื่อไซต์), SVS (ภาพลูกโลกเท่านั้น), JPL Horizons และแผนที่ LOLA ที่เผยแพร่แล้ว (ไว้ตรวจสอบ) ทุกไฟล์ล็อกด้วย SHA-256",
    },
    {
      n: 5, id: "tools", title: "Tools", who: "A",
      cues: [],
      text: "The science is Python: NumPy, SciPy, SpiceyPy and rasterio. FastAPI and PostgreSQL serve it, and the interface is Next.js with three.js. We wrote automated tests with pytest and Vitest. We also used an AI coding assistant, Claude Code, and we say so openly. Every result is checked against NASA references.",
      thai: "เครื่องมือ: Python, FastAPI, PostgreSQL, Next.js, three.js และบอกตรง ๆ ว่าใช้ AI (Claude Code) ช่วยเขียนโค้ด โดยผลลัพธ์ทุกอย่างตรวจกับข้อมูลอ้างอิงของ NASA",
    },
    {
      n: 6, id: "method", title: "How the numbers are made", who: "A",
      cues: [],
      text: "For each site we build the terrain skyline from LOLA: 1,440 directions, out to 200 kilometres. SPICE gives the Sun and Earth positions every hour of 2027. If a body is above the skyline, it counts. That gives time in sunlight, longest darkness, and Earth line of sight: geometry only, not a radio link.",
      thai: "วิธีคำนวณ: สร้างเส้นขอบฟ้าจากภูมิประเทศ 1,440 ทิศ ไกล 200 กม. แล้วใช้ SPICE หาตำแหน่งดวงอาทิตย์และโลกทุกชั่วโมงในปี 2027 ถ้าอยู่เหนือเส้นขอบฟ้าถือว่ามองเห็น (โลกคือแนวมองเห็นเชิงเรขาคณิต ไม่ใช่ลิงก์วิทยุ)",
    },
    {
      n: 7, id: "evidence", title: "Evidence and validation", who: "B",
      cues: [],
      text: "Every value is tagged: observation, derived, model, calculation, assumed or placeholder. Click one and you see the source, the method, the limits and the file hash. We check our geometry against JPL Horizons, our sunlight against published LOLA maps, and our code with hundreds of automated tests.",
      thai: "ทุกค่ามีแท็กหลักฐาน คลิกเพื่อดูที่มา วิธีคำนวณ ข้อจำกัด และแฮชของไฟล์ เราตรวจกับ JPL Horizons แผนที่ LOLA ที่เผยแพร่ และชุดทดสอบอัตโนมัติหลายร้อยรายการ",
    },
    {
      n: 8, id: "compare-how", title: "Compare: how it decides", who: "A",
      cues: ["Step 1 is on screen. [CLICK] when you say 'Second'. [CLICK] when you say 'Third'."],
      text: "Now our key feature: Compare. First, you say what the mission needs, and any hard limits. Second, a site that breaks a limit is ruled out, with the reason, never just scored lower. Third, you get one recommended site, with its reasons and what it gives up. The scales behind the score are shown as assumptions.",
      thai: "Compare (ฟีเจอร์เด่น): 1) บอกความต้องการของภารกิจและข้อจำกัดเด็ดขาด 2) ไซต์ที่ฝ่าฝืนข้อจำกัดจะถูกตัดออกพร้อมเหตุผล ไม่ใช่แค่ลดคะแนน 3) ได้ไซต์แนะนำหนึ่งแห่งพร้อมเหตุผลและสิ่งที่ต้องยอมเสีย สเกลคะแนนแสดงเป็นสมมติฐาน",
    },
    {
      n: 9, id: "compare-result", title: "Compare: three missions, three answers", who: "B",
      cues: ["[CLICK] when you say 'Balanced'. [CLICK] on 'landing safety'. [CLICK] on 'five-degree slope limit'."],
      text: "Same three sites, three missions. Balanced: Peak near Shackleton wins, 71 to 58, and the pick holds under every one-step change. If only landing safety matters, Malapert massif wins, narrowly: 70.5 to 69.2. Set a five-degree slope limit, and the other two are excluded, with their slopes shown. Same data, different mission, different answer, and the tool shows why.",
      thai: "สามภารกิจ สามคำตอบ: แบบสมดุล → Peak near Shackleton (71 ต่อ 58 และไม่เปลี่ยนเมื่อปรับลำดับความสำคัญหนึ่งขั้น), เน้นความปลอดภัยในการลงจอด → Malapert massif (70.5 ต่อ 69.2 ชนะเฉียดฉิว), จำกัดความชัน 5° → เหลือ Peak near Shackleton เพียงแห่งเดียว",
    },
    {
      n: 10, id: "demo", title: "Live demo", who: "A and B", fixedSeconds: 60,
      cues: [
        "Footage runs about 60 s: globe, Illumination, Terrain, Compare (three beats), Data. Say the lines at the marked times.",
        "Live version: switch to https://lunarseye.onrender.com (open it 2 minutes BEFORE; the free server needs ~45 s to wake).",
      ],
      beats: [
        { at: "0:00", who: "A", text: "On the globe, 27 cited sites sit under the real SPICE Sun. We pick Peak near Shackleton." },
        { at: "0:10", who: "B", text: "Hour by hour: gold is sunlight, blue is Earth. The sky chart shows the terrain skyline. Where the Sun is below it, terrain blocks the light." },
        { at: "0:22", who: "A", text: "Terrain uses the 20-metre LOLA model for slope and roughness. You enter your own thresholds. We ship no default safe value." },
        { at: "0:32", who: "B", text: "On Compare, we answer three questions, add a slope limit, and one site comes back with its reasons. Two sites are excluded, and the page says why." },
        { at: "0:52", who: "A", text: "And Data lists every NASA file with its checksum." },
      ],
      thai: "เดโม (ประมาณ 60 วินาที): ลูกโลก → Illumination → Terrain → Compare (ตอบคำถาม, ใส่ข้อจำกัดความชัน, ได้ไซต์แนะนำ) → Data",
    },
    {
      n: 11, id: "team", title: "Team roles", who: "B",
      cues: ["Roles are on the slide. Add one sentence in your own words about how you worked together."],
      text: "We are a team of two. Thammapat handled research refinement, frontend development and the direction of the project. Jinn handled the backend, management, the algorithm and the research data. [ONE SENTENCE ON HOW YOU DECIDED AND CHECKED TOGETHER.]",
      fillIn: true, fillWords: 14,
      thai: "แนะนำสมาชิกและหน้าที่ของแต่ละคน (กรอกใน config/team.json และพูดด้วยคำของตัวเอง)",
    },
    {
      n: 12, id: "process", title: "Process: photos and video", who: "A",
      cues: [],
      text: "Our public commit history tells the story: first the end-to-end path, then Illumination, Terrain, Compare, a live deployment, and a full interface audit, with tests at every step.",
      thai: "ประวัติ commit บอกเรื่องราวการพัฒนา: เส้นทางหลัก → Illumination → Terrain → Compare → deploy → ปรับ UI พร้อมแสดงภาพ/คลิปทีม",
    },
    {
      n: 13, id: "limits", title: "Honest limits and what's next", who: "B",
      cues: [],
      text: "LUNARSEYE is decision support, not a mission decision. Coordinates are tile centres, not landing points. Earth visibility is geometry, not a radio link. Our scales are assumptions that lander engineers should review, and our site list is NASA's 2022 one. Next: expert-reviewed scales, the current regions, finer terrain, and solar-energy estimates.",
      thai: "ข้อจำกัด: เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่การตัดสินใจภารกิจ; พิกัดคือจุดกึ่งกลางไทล์; โลกมองเห็นเชิงเรขาคณิตเท่านั้น; สเกลเป็นสมมติฐาน; รายชื่อไซต์เป็นของ NASA ปี 2022 ขั้นต่อไป: ให้ผู้เชี่ยวชาญทบทวนสเกล อัปเดตรายชื่อ ภูมิประเทศละเอียดขึ้น และประเมินพลังงานแสงอาทิตย์",
    },
    {
      n: 14, id: "end", title: "Thank you", who: "A and B",
      cues: ["Wordmark appears by itself. Both members on camera."],
      text: "Thank you. LUNARSEYE: lunar south-pole site analysis. Try it at lunarseye dot onrender dot com.",
      thai: "ขอบคุณ ลองใช้ได้ที่ lunarseye.onrender.com",
    },
  ],

  // Likely judge questions (Bangkok organiser criteria: usefulness, relevance, potential for further development,
  // presentation skills, answering questions; Space Apps: impact, creativity, validity, relevance, presentation).
  qa: [
    { q: "Why should we trust the recommendation?", a: "Treat it as decision support. Hard limits are applied first, and a site that breaks one is excluded with the reason. Weights and scales are labelled ASSUMED and shown in full. The pick is re-run with every priority moved one step, and the page says whether it flips. Every number opens its source and method. The scales have not yet been reviewed by lander engineers, and we say so." },
    { q: "Which NASA data did you use, and for what?", a: "Seven sources: LOLA terrain at 240 m (horizon) and 20 m (slope, roughness) via NASA PDS and PGDA; SPICE and DE440 from NAIF for Sun and Earth geometry; PGDA site tiles and NASA's candidate regions for the 27 sites; the SVS Moon Kit for the globe picture only; JPL Horizons and published LOLA illumination maps for validation. Each file's URL, size and SHA-256 are recorded." },
    { q: "How did you validate the results?", a: "Sun and Earth angles are compared with JPL Horizons (test tolerance 0.01 arc-second). Sunlight and Earth visibility are compared with the published LOLA maps by Mazarico et al. (tolerance 0.05, largest measured difference 0.042). The published maps use another period and DEM, so they are a sanity check, not an identical comparison. There are also hundreds of unit and API tests." },
    { q: "Is Earth visibility the same as having a communication link?", a: "No. It is geometric line of sight above the terrain horizon. Link budget, antennas, ground stations and multipath are not modelled, and the page says so." },
    { q: "Are these landing sites?", a: "No. Each coordinate is the centre of a PGDA 5 m DEM tile for a candidate region, not a selected landing point. NASA describes its regions as about 15 km across and a landing site as about 100 m." },
    { q: "NASA changed its candidate regions. Is your list current?", a: "Our catalogue uses NASA's 2022 list of 13 regions. NASA published an updated set of nine regions in October 2024, and, as far as we found, has named no landing site since; its pages say the first landing is now planned for Artemis IV in 2028 at the lunar south pole. Updating the catalogue is on our next-steps list. [Re-check NASA's Artemis pages before you speak.]" },
    { q: "What AI did you use, and how?", a: "We used Claude Code (Anthropic) as a coding assistant, and we disclose it. Results are checked by automated tests and NASA references, not by the assistant. [Say who defined the problem and chose the approach; Space Apps asks that AI is not used to come up with the idea.]" },
    { q: "Why does a run say '≥' (for example 'longest sunlit run ≥ 130 d')?", a: "A run that touches the edge of the analysis window may have started earlier or continue later, so its length is only a lower bound. We mark it instead of presenting it as exact." },
    { q: "How do you handle slope and roughness?", a: "From the PGDA 20 m DEM: slope at the site and the 95th percentile over a 50 m footprint (40 m baseline), and RMS roughness (100 m baseline). Thresholds are entered by the user; we ship no default 'safe' value. NASA's own lander tilt limit and terrain screens are different numbers, so we do not claim a pass or fail." },
    { q: "What would you do next?", a: "Have domain experts review the scales, update the site list to NASA's current regions, add finer terrain (10 m and 5 m) for every site, and add solar-energy and thermal estimates, which are not scored today." },
    { q: "Is it fast enough to use?", a: "Default timelines for all 27 sites are pre-computed when the service is built, so a comparison of ten sites returns in about two seconds on the free hosting we use; the first request after a long idle takes about 45 seconds while the server wakes." },
  ],
};
