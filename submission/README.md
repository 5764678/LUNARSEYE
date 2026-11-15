# LUNARSEYE: NASA Space Apps presentation package

Slides, script and video guide for the 5–7 minute English presentation video (deadline **16 Nov 2026, 18:00 ICT** via LINE OA `@droneth`; late until 17 Nov 18:00 with a score deduction).

## Files

| File | What it is |
|---|---|
| `LUNARSEYE_deck.pptx` | The deck: 14 core slides + 4 appendix slides. Fade transitions, 3 click-builds (slides 4, 8, 9), 2 automatic reveals (slides 1, 14). Speaker notes = the script. |
| `LUNARSEYE_deck.pdf` | Backup with fonts embedded (shows each slide in its final state; animations are not in a PDF). |
| `script/LUNARSEYE_script.md` | Timed English script (about 6:00), speaker split, click cues, trim list, pronunciation, Thai gist per slide, 11 judge questions with answers. |
| `script/transcript_for_captions.txt` | The spoken text, one sentence per line, for YouTube "auto-sync" captions or Whisper. |
| `EDITING_GUIDE.md` | How to record, put both faces on the video, fix loudness, caption, export, publish and submit. |
| `tools/compose.sh` | ffmpeg helper: `pip`, `side`, `norm`, `burn`, `export`, `check`. Tested on synthetic clips. |
| `config/team.json` | Team name, challenge title, members, roles, photos, optional demo video. **Fill it in.** |
| `data/results.json` | The real numbers on slides 2 and 9, fetched from the live Compare API (2027, hourly). |
| `assets/live`, `assets/derived` | Real screenshots of https://lunarseye.onrender.com (nothing mocked) and crops made from them. |
| `fonts/` | IBM Plex Sans/Mono (OFL) from the app. Install them before opening the .pptx; otherwise PowerPoint substitutes another font. Google Slides already has IBM Plex. |
| `build/` | Everything that regenerates the above (capture, crops, deck, script). |

## Before you record: fill in (orange on the slides)

1. `config/team.json`: `team_name`, `challenge_title` (likely "Lunar Landing Site Navigator": **check the exact title on your team page**), each member's `role` and `responsible_for`, optional `photo` paths and `process_photos` (up to 3). The member names were read from the end card of your demo video: **check the spelling**.
2. `script/narration.js`: the `[TEAM NAME]`, roles and process sentences (slides 1, 11, 12).
3. Rebuild (from this folder):
   ```bash
   node build/build_deck.js && python3 build/postprocess.py   # deck (needs: cd build && npm install pptxgenjs sharp; NODE_PATH=build/node_modules)
   node build/make_script.js                                   # script + captions text
   ```
   Then copy `build/out/LUNARSEYE_deck.pptx` over `LUNARSEYE_deck.pptx`.

## Requirements matrix

| Requirement (organiser's notices) | Covered by |
|---|---|
| 1. NASA data: how used, which parts | Slide 4 (7 sources, what each is used for, SHA-256 pinning); slide 15 (citations and credits) |
| 2. Tools and technologies | Slide 5 (stack, tests, **AI-assistance disclosure**) |
| 3. Application of data and tools to the challenge, practical benefit | Slides 2, 6, 7, 8, 9: the method, evidence tags, validation, and **Compare** (mission questions → one recommended site) with real results for three missions |
| 4. Live demo | Slide 10 (demo run order, live URL + QR); script demo beats; `EDITING_GUIDE.md` §5 |
| 5. Team roles and responsibilities | Slide 11 (fill in `config/team.json`) |
| 6. Photos and videos of the work | Slide 12 (build log from real git history + three slots for your own photos/clip) |
| English | Script, slides, captions text |
| 5 min recommended, 7 min maximum | Script plan 5:58 (6:37 at 110 wpm, 5:28 at 140 wpm); `compose.sh check` warns above 7:00 |
| Faces of all members visible | Face corner kept clear on every slide (`EDITING_GUIDE.md` §2); `compose.sh pip` / `side` |
| Slides included in the video | Deck shown in full-screen slideshow |
| Submit: link, project title, team name, all members' full names | Template in `EDITING_GUIDE.md` §7 |
| Judging questions | `script/LUNARSEYE_script.md` §5 (Q&A mapped to criteria) |

## What the deck says, and what it does not (honesty rules)

- Every number comes from the live app or from the repository's own data manifests. Compare results (71.3 / 58.2 / 50.4 balanced; 70.5 vs 69.2 landing-only; 5° limit leaves only Peak near Shackleton) were fetched from the live API on 15 Nov 2026 and match the values pinned in the project's tests.
- Compare is presented as **decision support**. Its scales and weights are shown as assumptions (slide 9 and appendix 16), not reviewed by lander engineers.
- Site coordinates are DEM tile centres, not landing points. Earth visibility is geometric line of sight, not a radio link.
- The site list is **NASA's 2022 set of 13 regions**. NASA published an updated set of nine regions on 28 Oct 2024; as of November 2026 NASA's pages name no landing site, Artemis III is a 2027 Earth-orbit test, and the first landing is planned for Artemis IV in 2028 (research report, sources below). The deck does not call any site an "Artemis III landing site".
- No NASA logo is used. The credits say the project is not endorsed by NASA.
- AI use is disclosed on slide 5, the end card, and in the description template. Space Apps asks that AI is not used to come up with the project idea: be ready to say who had the idea.
- Test counts on slide 7 (299 Python + 60 web) are the last full run recorded in the project's STATUS.md on 14 Nov; they were not re-run for this package.

## Open items I could not verify (please check)

1. **Format and deadline of the global Space Apps submission** (research only reached search summaries of the official pages): a 7-slide deck or 30-second video, closing 15 Nov 2026, 11:59 pm local time. Your organiser's notices (5–7 min video, 16 Nov 18:00) are what this package follows. Ask me for a 7-slide cut if you need it.
2. Whether the 15 Nov live meeting and the 16 Nov video are both required.
3. Whether "faces visible" means always (this package assumes yes) or at least once.
4. NASA's current candidate regions and whether an Artemis IV site has been named: re-check NASA's Artemis pages the day you record.

## Source notes

Research notes and the synthesized report (rules, NASA facts, video practice) were produced in this session and are in the session scratchpad; the facts used on the slides are cited on slide 15 and in the script's Q&A. Key sources: NASA Artemis pages (Aug 2022, Oct 2024, Feb 2026, Nov 2026), NASA SVS 4720 and 5013, PGDA products 69/78/90, NAIF, JPL Horizons, and the dataset manifests in `packages/data/src/lunareyes_data/manifests/`.
