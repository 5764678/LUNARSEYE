# LUNARSEYE: how to record, edit and submit the video

Everything here was tested on synthetic clips (`tools/compose.sh`, ffmpeg 6.1). Real footage is yours: always watch the final file once, start to end, before you send it.

## 0. What the organiser requires (from the two notices you pasted)

| Requirement | Where it is handled |
|---|---|
| Video of the team's project, **English** | Script is English. Speak at a normal pace (110–130 words a minute). |
| **Faces of all members visible** in the video | Every slide keeps the bottom-right corner empty for the faces (section 2). |
| **Slides included** in the video | The deck, shown in full-screen slideshow. |
| **5 minutes, not more than 7** | Script plan: about 6:00. Hard stop 7:00 (section 6 has a check). |
| Cover the 6 topics: NASA data, tools, application, demo, team roles, photos/video of the work | Slides 4, 5, 6–9, 10, 11, 12 (matrix in `README.md`). |
| Send by LINE OA `@droneth`: public video link, project title, team name, **full names of all members** | Template in section 7. |
| Deadline | **Mon 16 Nov 2026, 18:00 (ICT)**. Late (score deduction) until **Tue 17 Nov 18:00**. After that the team is withdrawn. Staff hours 09:30–17:30. |

The first notice also lists a meeting on **15 Nov** (link `meet.droneth.or.th/m/fbp-vjso-mhd`, "about 5 minutes, up to 7"). The same deck and script work live: switch to the live site for the demo (section 5). If your slot is today, check the meeting time with the organiser now.

**Ask the organiser in writing (LINE `@droneth`) about three things I could not verify:** (1) whether the 15 Nov meeting and the 16 Nov video are both required, (2) whether "faces visible" means at all times or at least once (the plan below satisfies "at all times"), (3) whether you must also submit on the global Space Apps portal (see section 8).

## 1. Choose how to record

| | A. One call (fastest, about 40 min) | B. Faces and slides separately (best quality, about 2 h) |
|---|---|---|
| How | Both members join a Zoom call with cameras on. One shares the slides in full-screen slideshow. Record the call. | Each member records their own camera and microphone. One person records the slides on screen. Combine with `tools/compose.sh`. |
| Faces | Zoom can record "gallery view with shared screen": every face stays in a strip at the top right. Google Meet records only the active speaker, so use Zoom or Teams. | Both faces always in the bottom-right corner (matches the slide design). |
| Editing | Trim the start and end, fix loudness, add captions. | Sync the three recordings, combine, fix loudness, add captions. |
| Risk | A mistake costs a retake of the whole section. Zoom's strip sits over the top-right of the slides (nothing important is there on the deck's content slides, but check slide 6 and 8). | More files to manage. A sync clap is essential. |

**Recommendation:** do A first so you have a safe version today. If there is time, do B for the final.

## 2. The face zone

On a 1920×1080 frame the deck keeps **x ≥ 1411 px, y ≥ 821 px** (the bottom-right 509×259 px) free of content. `compose.sh pip` places two 254×254 px face tiles exactly there, or three 169 px tiles if you have three members. Keep each face centred in its camera frame (the tool crops a centred square). Light your face from the front; do not sit with a window behind you.

If faces must be larger (for example they are small on a phone screen), use `compose.sh side`: the slides shrink to 75% and the faces get a column on the right.

## 3. Method A step by step (one call)

1. Both: quiet room, headphones, camera at eye level, window in front of you not behind. Close other apps. Make a 15-second test recording first.
2. Zoom → Settings → Recording → tick **Record gallery view with shared screen** (local recording). Presenter: Share Screen → the PowerPoint window in **Slide Show** mode (F5). Turn off notifications.
3. Open the script (`script/LUNARSEYE_script.md`) on a *second device* beside the camera, so your eyes stay near the lens.
4. Open the live site in a browser tab **two minutes before the demo** (the free server needs about 45 seconds to wake up). Click Compare once so the data is warm.
5. Start recording. Wait 3 seconds, say the first sentence. If you stumble, pause, breathe, and say the whole sentence again; you will cut the mistake later.
6. Follow the click cues in the script (slide 4: one click; slide 8: two clicks; slide 9: three clicks).
7. Stop recording 3 seconds after the last word. Both faces must be visible in the first and last 5 seconds (a "group shot" opening and closing).

## 4. Method B step by step (separate recordings)

1. **Slides video** (1920×1080, 30 fps): in PowerPoint use *Slide Show → Record Slide Show* or a screen recorder (OBS Studio, or the Windows Game Bar `Win+G`, or macOS `Shift+Cmd+5`). Run through the deck with the script timing, clicking at the cues. If you record the screen, hide the mouse. Export as `slides.mp4`. *PowerPoint's own recording ignores transitions and adds 5 seconds to slides without timing, so a screen recording is more predictable.*
2. **Face videos:** each member records their own camera and microphone for the *whole* talk (including the minutes when the other speaks, silently) in 1080p. Both press record at the same moment on a call, then **clap once in front of the camera** so you can sync later. Name the files `faceA.mp4`, `faceB.mp4`.
3. Find the clap in each file (open in any player, note the second where the sound spike appears). If B's clap is 0.35 s later than A's, run with `DELAY_B=-0.35` (positive delays B, negative advances it).
4. Combine:
   ```bash
   DELAY_B=-0.35 tools/compose.sh pip slides.mp4 faceA.mp4 faceB.mp4 combined.mp4
   ```
   Audio from both microphones is mixed. Check lip sync at the start, middle and end. (Trim the clap and the lead-in first with any editor if you like.)
5. Continue with section 6.

## 5. The demo (slide 10)

Your own demo video (the one whose frames you sent) matches the deck beat for beat: *hook → Overview → Illumination → Terrain → Compare (questions, limits, recommendation) → Data → wordmark*, with the captions "27 cited sites, lit by the real SPICE Sun", "Hour by hour: sunlight and Earth line of sight", "Slope and roughness from the 20 m LOLA DEM", "Say what the mission needs, and its limits", "Hard limits rule sites out, with the reason", "One recommended site, with the reasons shown", "Every number traces to a NASA source".

Two ways to use it:
- **Embed it in the deck:** copy the file to `assets/demo/lunarseye-demo.mp4`, set `"demo_video": "assets/demo/lunarseye-demo.mp4"` in `config/team.json`, run `node build/build_deck.js && python3 build/postprocess.py`. Slide 10 becomes the full-screen video. Keep it to about 60 seconds, and say the demo lines from the script at the marked times.
- **Cut it in while editing:** leave slide 10 on screen in the slide recording and put the demo footage over it in your video editor.

**Live demo (no video):** open `https://lunarseye.onrender.com`, pick *Peak near Shackleton* on Overview, press Play, open *Illumination & Earth*, *Terrain*, then *Compare*: leave the three questions at "Important" (the pick is Peak near Shackleton, 71.3), set *Only landing safety matters* (Malapert massif, 70.5), then set a slope limit of 5 (Peak near Shackleton is the only option). Finish on *Data*. Click any number once to show the evidence drawer.

## 6. Finishing: loudness, captions, export, check

```bash
tools/compose.sh norm   combined.mp4 combined_norm.mp4          # about -16 LUFS, 48 kHz
tools/compose.sh export combined_norm.mp4 LUNARSEYE_final.mp4   # 1080p30 H.264 + AAC
tools/compose.sh check  LUNARSEYE_final.mp4                      # length 5:00–7:00? loudness? size?
```
Open the check output: the duration must be **under 7:00**. If it is over, use the trim list in the script (cut words, not speed).

**Captions** help judges who are not native English speakers (research: captions help most when the viewer is not a native speaker, but automatic captions contain errors, so proofread):
- Best and easiest: upload to YouTube, then *YouTube Studio → Subtitles → Add → Auto-sync*, and paste `script/transcript_for_captions.txt`. It times your own script. Delete the sentences you did not say.
- Or generate an `.srt` with Whisper / Clipchamp / CapCut, fix it by hand, and burn it in:
  ```bash
  tools/compose.sh burn LUNARSEYE_final.mp4 captions.srt LUNARSEYE_final_cc.mp4
  ```
  Burned-in captions are always visible but can collide with text on a slide. Prefer YouTube's own captions (viewers can switch them on).

**Editing rules:** cut false starts and long pauses (more than 1.5 s); never cut the AI-assistance sentence, the limits slide or the end-card credits; add no music that you do not own; keep the group shot at the start and end.

## 7. Publish and submit

1. Upload to **YouTube as "Unlisted"** (anyone with the link can watch; no account needed). Do not use "Private". If you use Google Drive: share as **Anyone with the link, Viewer**. Use a personal account if your school account blocks external sharing.
2. Wait until HD processing finishes. Open the link in a **private/incognito window and on a phone** while logged out, and watch it from 0:00 to the end.
3. In the YouTube description write: the project name, the challenge, the live link, **the AI-use statement** ("Claude Code (Anthropic) helped write the code. Sun and Earth positions come from NASA SPICE, not from an AI model. Independent project, not endorsed by NASA."), and the NASA data credits (slide 15).
4. Send in LINE `@droneth` (https://lin.ee/N8eJFl9X) — all four items are required:

```
ลิงก์คลิปวิดีโอนำเสนอผลงาน / Video link: <paste the public link>
ชื่อโครงงาน / Project title: LUNARSEYE — lunar south-pole site analysis
ชื่อทีม / Team name: [TEAM NAME]
สมาชิก / Team members: Thammapat Deesaysamongkol, Jinn Sawasdivorn
```
Check the spelling of every name exactly as the organiser registered it. Keep a copy of the video file in two places.

## 8. Things to confirm (could not be verified from here)

- **Global Space Apps submission.** My research could not read spaceappschallenge.org (it returned errors) and relied on search-tool summaries: the global project submission closes **Sunday 15 Nov 2026, 11:59 pm local time**, and its demo field accepts **a video of 30 seconds or less or a deck of up to 7 slides** (a 5–7 minute video is not accepted there). If you also submit globally, you need a 7-slide deck (core slides 1, 2/3, 4+5, 6+7, 8, 9, 13 plus credits in the footer). Ask me and I will generate it.
- **Bangkok pitch format.** A third-party organiser page says "3–5 minutes, English, on Zoom with your camera on" and scores usefulness, relevance, potential for further development, presentation skills and answering questions. Your notices say 5–7 minutes, so follow your notices, and prepare the Q&A in the script.
- **AI disclosure.** Space Apps allows AI tools if disclosed, and asks that AI is not used to come up with the idea. The deck and the description disclose Claude Code. Be ready to say who had the idea.
- **Likeness.** Submitting means NASA may use names and likenesses; under-18 participants need guardian consent. Tell every member before recording.
- **Challenge title.** The 2026 challenge that matches this project looks like **"Lunar Landing Site Navigator"** (another source calls it "CLPS Lunar Mission Browser"). Check the exact title on your team page and put it in `config/team.json`.

## 9. Final checklist

- [ ] All members' faces visible for the whole video (at least at start and end)
- [ ] Spoken English; every number you say matches the slide
- [ ] Slides visible; demo shown; roles slide filled in; photos or a clip on slide 12
- [ ] 5:00–7:00 (`compose.sh check`); loudness about -16 LUFS; no echo
- [ ] AI-assistance and "not endorsed by NASA" statements present (slide 5, slide 14, description)
- [ ] No NASA logo anywhere; NASA data credited (slide 15)
- [ ] Link opens in a private window and on a phone; sent in LINE with all four items before **16 Nov 18:00 ICT**
