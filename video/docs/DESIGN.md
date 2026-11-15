# LUNARSEYE promo: design spec

A 29.8 s film (1920×1080, 30 fps, 894 frames) that walks every page of the live site, for the
2026 NASA Space Apps Challenge submission. Mode: autonomous (the user chose it); every decision
below is recorded instead of confirmed step by step.

## 1. Product brief

| | |
| --- | --- |
| Product | LUNARSEYE: lunar south-pole landing-site analysis. Pick a cited candidate site, see the Moon lit from the SPICE Sun, the site's terrain-aware sunlight and Earth line of sight, its slope and roughness, and a side-by-side that recommends one site for a stated mission. Every number carries a tag that opens its source, method and limits. |
| Audience | Space Apps judges and other teams; assume a phone or an embedded player. |
| Use | Challenge submission video, 30 s maximum. |
| Must show | All five pages: Overview, Illumination & Earth, Terrain, Compare, Data. Compare carries the explanation of how it helps decide the best landing site (asked for by the user). |
| Name | LUNARSEYE (the user's choice; it is also what the deployed pages show). |
| Source of truth | The deployed line of the repo, branch `claude/gifted-allen-smvncn` (what lunarseye.onrender.com runs). `main` has three pages and no Compare, so it was not used. |

## 2. Requirements → execution

| Requirement | Decision |
| --- | --- |
| "Real pages and assets" | Every page image is a capture of the product running locally from the deployed branch with the real NASA data (SPICE kernels, LOLA LDEM 240 m, PGDA 20 m DEM over HTTP ranges, NASA SVS colour map). Nothing on a page is redrawn or edited. Fonts and colours on the film's own text are the product's (IBM Plex, `tokens.css`). |
| Live pages, not screenshots | Overview, Illumination and Terrain are frame sequences: the product's own Play button, with the browser clock paused and stepped 1/30 s per frame. Terrain also gets a real orbit drag. |
| 30 s maximum | 29.8 s. |
| Compare explains the decision | The longest beat (8.7 s of 29.8 s), three real page states reached by real input: sunlight marked Critical → "longest darkness 7 days" typed and committed → two sites excluded with the reason, one recommended. |
| Data | All public NASA data and public catalogue sites: no private, personal or live data, so nothing is masked or faked. |
| Audio | No music was specified. `bgm-tech-house.mp3` (124.00 BPM, Mixkit licence) from the skill's library; cuts sit on its beat grid and its drum entry (beat 32, 15.7 s) is where the recommendation lands. Delivered with and without music. |
| Live site unreachable from the build container | lunarseye.onrender.com is blocked by the container's network policy; the same commit was run locally instead. |

## 3. Visual direction

Considered: (a) "instrument": the film is the product's own surface, dark and neutral, the camera
only reframes; (b) "mission briefing": the pages as panels in a 3D space with HUD dressing;
(c) "editorial": title cards between pages. Chosen: **(a)**. The product's design system is
strict ("chrome is neutral, colour is data") and a second visual skin would contradict it; (b)
adds decoration the product deliberately lacks; (c) spends seconds a 30 s film does not have.
A styleframe pass was skipped: the product's tokens are a complete brand spec, and the first
rendered stills served the same purpose.

Tokens (from `apps/web/src/app/tokens.css`):

- Surfaces `#05070a` bg, `#0b0f14` panel, `#020305` plate. Ink `#e6eaef`, `#f4f7fa` hot, `#8d97a6` muted.
- Data hues, one meaning each: Sun `#ffd166`, Earth `#6cc3ff`, terrain `#b08968`, verified `#46d19f`.
  The film uses them only with those meanings (the three facets under the opening title, the
  "verified" seam on the Data records).
- Type: IBM Plex Sans (text) and IBM Plex Mono (numbers, chips, the wordmark's supporting lines).
- Film text sizes: captions 60 px, chips and supporting lines 32–40 px (readable in a phone-sized player).

Motion voice ("professional trust" preset, low energy, serious): entrances decelerate on
`bezier(0,0,0.2,1)`, camera moves on `bezier(0.33,0,0.15,1)`, about 20 frames, no bounce. The one
overshoot is the recommended-site card lifting and landing. No camera shake, no beat pulses on the
frame: the music sets when things happen, never how hard.

## 4. Feature → shot

| Page / feature | Shot card (variant) | Why |
| --- | --- | --- |
| Opening question | `blur-slide` | The default, quiet title reveal; the globe behind it is the subject. |
| Overview: globe, sites, timeline | camera over the live sequence (no card) | The product's own playback is the motion. |
| Illumination & Earth: terrain vs flat | `fui-hud-moves` (B, reticle-lock-on) | Points at one row without freezing a live page. |
| Terrain: 3D scene, slope, roughness | camera over the live sequence (no card) | A real orbit and the moving Sun are the motion. |
| Compare: mission questions | `input-trigger-moves` (A, cursor-performance) | The viewer watches the product being used. |
| Compare: the recommendation | `spotlight-hero-card` | One protagonist: the answer. |
| Data: dataset registry | `row-embed` | Records that seat into the page: "structured data grows into the page". |
| Page-to-page | `shot-transitions` (C, focus handoff) | Low-energy, reads as moving through one instrument. |
| Wordmark | `letterspace-materialize` | The brand is a wide-tracked capital wordmark. |

Adaptations (each card's "known pitfalls" are kept):

- `spotlight-hero-card`: the card is the full page width, so the side view is 15° instead of 34°
  and the lift 70 px instead of 110 px; beam and slot outline are neutral greys (the product
  reserves colour for data). Lock → touchdown is 122 frames (4.1 s); two beam laps, fast then slow.
- `fui-hud-moves` B: on the dark page the lock brightening is 0.16 → 0.07 instead of 0.55 → 0.28,
  and the rest of the page dims on lock so the label lands on quiet ground.
- `input-trigger-moves` A: no separate punch-in; the camera already frames the form.
- `shot-transitions` C: the crossing window is 10 frames (card: 10–16), two frames staggered.
- `letterspace-materialize`: L and Y skeleton glyphs were drawn to match the card's set.

## 5. Storyboard and frame timeline

Beat grid: `t = 0.25902 + n × 0.48389 s`. Frames are `beatF(n)`; see `src/timeline.ts`.

| # | Beats | Frames | Shot | Key motion | Caption |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–6 | 0–95 | Opening: inside the globe canvas, the terminator crossing the candidate sites | Title, word by word; hold | "Where should we land at the Moon's south pole?" + Sunlight / Earth line of sight / Terrain |
| 2 | 6–14 | 95–211 | Overview: pull back to the whole page, then in to the timeline lanes while it plays | One continuous take with shot 1 | Overview · 27 cited sites, lit by the real SPICE Sun |
| 3 | 14–21 | 211–313 | Illumination & Earth: sky chart playing, then the Sunlight table | Reticle locks on "Time with direct sunlight": terrain 73.5 %, flat 57.3 % | Illumination & Earth · Hour by hour: sunlight and Earth line of sight |
| 4 | 21–28 | 313–414 | Terrain: the 3D scene orbiting under the moving Sun, then the slope and roughness table | Camera settles on the table | Terrain · Slope and roughness from the 20 m LOLA DEM |
| 5a | 28–32 | 414–472 | Compare: cursor sets sunlight to Critical, types a 7-day darkness limit | Click, type, commit on beat 32 | Compare · Say what the mission needs, and its limits |
| 5b | 32–46 | 472–676 | Compare: the recommendation. Spotlight locks, side view, the card lifts, beam twice, reseats; hold | Hero arc, then 1.7 s still | Compare · Hard limits rule sites out, with the reason → One recommended site, with the reasons shown |
| 6 | 46–52 | 676–763 | Data: four dataset records seat into the page | Row-embed, verified-green seam | Data · Every number traces to a NASA source |
| 7 | 52–61 | 763–894 | Wordmark, tagline, challenge and URL | Drawn in 50 frames, done on beat 56, 2.4 s hold | none (brand close) |

Sound plan: see the cue table in `src/Soundtrack.tsx`.

## 6. Notes for whoever re-renders this

- `npm run capture -- ov il tr static` regenerates every page image (the product must be running
  on :3000; see `scripts/capture.mjs`). `public/seq/` is not committed (about 1 GB).
- The Data page's NASA SVS record still says "LUNARIS uses it ONLY as the visual surface": that
  is the live page's text, left as it is.
