# LUNATHEGOAT: text to paste into the Space Apps team page

I cannot log in to spaceappschallenge.org, so these are ready-to-paste values for each field. Your page already shows: Local event **Bangkok (2026 NASA Space Apps Challenge)**, Challenge **Lunar Landing Site Navigator**, Owner **Thammapat Deeswasmongkol (matthewtmpp)**.

## About tab

**Team Name:** `LUNATHEGOAT`

**Description** (limit 500 characters; this is 393):

```
LUNATHEGOAT builds LUNARSEYE for the Lunar Landing Site Navigator challenge: a web tool that uses NASA LOLA terrain and SPICE geometry to compute terrain-aware sunlight and Earth line of sight for 27 south-pole candidate sites, then recommends one site for a mission's needs, with the source of every number. Live: lunarseye.onrender.com. Team of two: frontend + research, backend + algorithm.
```

(Your current line, "vibe ทั้งวัน vibe ไม่หยุด โอพุษคือพ่อ", is fine as a joke but the page is public and judges may read it. If you want to keep it, add it after the text above; there is room for about 100 more characters.)

**Desired Skills & Interests** (tick): Planets & Moons, Moon, Space Exploration, Sun, Software, Coding, Web Development, Data Analysis, Data Visualization, Human Exploration. Optional: Artificial Intelligence & Machine Learning (you use an AI coding assistant), Graphic Design.

**Languages Spoken:** English, Thai.

**Accepting Team Members:** tick it **only until Jinn Sawasdivorn has joined the team on the website** (it lets teammates formed in person join officially). Check the Members tab: both of you must be listed. Then untick it so strangers cannot join.

**Team Contact Information:** leave as it is (only your team sees it).

**Team Photo:** the page says: no copyrighted or trademarked images, **no minors**, only images you have the right to use. Use a photo of you two only if everyone in it is an adult. Otherwise use `team-card.png` in this folder: the LUNARSEYE end card (wordmark over the Moon, team and member names). It contains no NASA logo; the Moon picture is rendered from the NASA SVS Moon Kit (credit: "NASA's Scientific Visualization Studio").

## Project tab (field names may differ; copy what fits)

**Project title:** `LUNARSEYE: lunar south-pole site analysis`

**Short summary:**

```
LUNARSEYE compares candidate lunar south-pole landing sites by terrain-aware sunlight, Earth line of sight, and slope, and recommends one site for a stated mission, showing the NASA source, method and limits behind every number.
```

**Detailed description:**

```
Problem: choosing where to land near the lunar south pole depends on how long the Sun shines, whether Earth is in view, and how smooth the ground is. These answers sit in different NASA archives and are hard to compare.

What we built: LUNARSEYE, a web application with five pages: Overview (the Moon lit by the real SPICE Sun direction), Illumination & Earth (sky chart, hourly sunlight and Earth windows), Terrain (3D south pole, slope and roughness from the 20 m LOLA DEM), Compare, and Data. In Compare, the user says what the mission needs (sunlight, Earth link, smooth ground) and sets hard limits; sites that break a limit are excluded with the reason, and one site is recommended with its reasons and what it gives up. Every number carries an evidence tag (observation, derived, model, calculation, assumed, placeholder) that opens its source, method, limits and SHA-256.

NASA data: LRO/LOLA elevation (240 m and 20 m), NAIF SPICE with DE440, NASA SVS Moon Kit (visual only), PGDA site tiles and NASA candidate regions, JPL Horizons and published LOLA illumination maps (validation).

Limits: decision support, not a mission decision. Coordinates are DEM tile centres, not landing points; Earth visibility is geometric line of sight, not a radio link; Compare's scales are our assumptions and not reviewed by lander engineers; the site list is NASA's 2022 set of candidate regions.
```

**Demo link:** the public link to your video (after you upload it).

**Project / code link:** https://github.com/5764678/LUNARSEYE/tree/claude/gifted-allen-smvncn
(**Use this branch link.** The repository's default branch `main` does not contain the Compare and Data pages; they are on `claude/gifted-allen-smvncn`, the branch the live site is built from.)

**Live app:** https://lunarseye.onrender.com (the free server needs about 45 seconds to wake up).

**Use of AI (declare it honestly):**

```
Claude Code (Anthropic) helped write and review the code. Sun and Earth positions come from NASA SPICE, not from an AI model. Results are checked by automated tests and against JPL Horizons and published LOLA maps. No AI-generated images or video are used; screenshots are of the running application.
```
(Space Apps asks that AI is not used to come up with the project idea: only keep sentences you can stand behind, and say who had the idea.)

**References** (cite every source):

```
Smith, D. E., et al. (2010). Space Science Reviews, 150, 209-241. doi:10.1007/s11214-009-9512-y (LOLA; LDEM_75S_240M, NASA PDS)
Barker, M. K., et al. (2023). The Planetary Science Journal, 4, 183. doi:10.3847/PSJ/acf3e1 (20 m south-pole DEM, NASA GSFC PGDA product 90)
Barker, M. K., et al. (2021). Planetary and Space Science, 203, 105119. doi:10.1016/j.pss.2020.105119 (PGDA product 78)
Mazarico, E., et al. (2011). Icarus, 211(2), 1066-1081. doi:10.1016/j.icarus.2010.10.030
Acton, C. H. (1996). Planetary and Space Science, 44(1), 65-70 (NAIF SPICE)
Park, R. S., et al. (2021). The Astronomical Journal, 161(3), 105. doi:10.3847/1538-3881/abd414 (DE440)
NASA's Scientific Visualization Studio, CGI Moon Kit (SVS 4720)
NASA, candidate Artemis III landing regions, 19 Aug 2022 (and update 28 Oct 2024); SVS 5013
NASA JPL Solar System Dynamics, Horizons system (ssd.jpl.nasa.gov/horizons)
```

## Members tab

Both **Thammapat Deeswasmongkol** and **Jinn Sawasdivorn** must appear here before you submit. If Jinn is missing, tick "Accepting Team Members", have Jinn join, then untick.

## Before you press submit

- The Space Apps project submission may close **today, 15 Nov, 11:59 pm local time** (my research could not verify this on the official site). Check the Project tab for the exact deadline, and for demo limits (a 7-slide deck or a 30-second video may be required there).
- Your organiser's video (5–7 minutes, by LINE `@droneth`, 16 Nov 18:00 ICT) is separate.
