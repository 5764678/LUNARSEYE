// The single source of truth for time. Every cut sits on a beat of the music.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Beat grid of public/audio/bgm.mp3 (124.00 BPM, analysis in analysis/beat_data.json).
// Beats are the kick drum. (The beat tracker locks onto the off-beat hi-hat, half a beat early;
// analysis/analyze_bgm.py finds the kick's phase and reports this value as `t0`.)
export const SOURCE_BEAT0 = 0.01717; // s, first kick-grid beat in the source track (beat_data.json t0)
export const BEAT_INT = 0.48389; // s per beat
export const OUTPUT_AUDIO_OFFSET_SEC = 0.0428; // AAC priming of this pipeline (Remotion 4.0.484, AAC 48 kHz, mp4), measured: analysis/measure_audio_offset.py
export const beatT = (n: number) => SOURCE_BEAT0 + OUTPUT_AUDIO_OFFSET_SEC + n * BEAT_INT;
export const beatF = (n: number) => Math.round(beatT(n) * FPS);

/** Cuts, in beats. The drums of the track enter on beat 33 (15.99 s): that is where the answer lands. */
export const CUT = {
  pullBack: beatF(7), // the globe hands over to the Overview page
  illum: beatF(15),
  terrain: beatF(22),
  compare: beatF(29),
  answer: beatF(33), // the mission limit is committed and the recommendation changes
  data: beatF(47),
  outro: beatF(53),
  wordmark: beatF(57), // the wordmark finishes drawing
  end: Math.round(29.8 * FPS), // the film is 29.8 s whatever the music does: the limit is 30
} as const;

export const TOTAL = CUT.end; // 894 frames

/** Half-width of a focus handoff between two pages: each page runs this far past its cut. */
export const HAND = 6;

const span = (from: number, to: number) => ({ from, duration: to - from });

/** Shots, in absolute frames. Neighbours overlap by 2 x HAND: the handoff lives in the overlap. */
export const SHOTS = {
  overview: span(0, CUT.illum + HAND),
  illum: span(CUT.illum - HAND, CUT.terrain + HAND),
  terrain: span(CUT.terrain - HAND, CUT.compare + HAND),
  compare: span(CUT.compare - HAND, CUT.data + HAND),
  data: span(CUT.data - HAND, CUT.outro + HAND),
  outro: span(CUT.outro - HAND, TOTAL),
} as const;

/** Beats inside the Compare shot, in absolute frames (the scene converts to local time). */
export const CMP = {
  cursorIn: CUT.compare + 2,
  hover: CUT.compare + 18,
  click: CUT.compare + 22, // sunlight: Critical
  toField: CUT.compare + 27,
  field: CUT.compare + 38, // the darkness limit takes focus
  typed: CUT.compare + 45, // "7"
  enter: CUT.answer, // committed on the beat the drums enter
  lock: CUT.answer + 24, // the camera has reached the recommendation, flat
  pushAt: CUT.answer + 48, // swing to the side view
  rise: CUT.answer + 64, // the card lifts
  hover2: CUT.answer + 74, // it hovers; the beam runs
  reseat: CUT.answer + 128,
  land: CUT.answer + 146,
} as const;

/** Beats inside the Illumination shot, in absolute frames. */
export const ILL = {
  toTable: SHOTS.illum.from + 44,
  flyIn: SHOTS.illum.from + 50,
  lock: SHOTS.illum.from + 82, // the reticle bites
} as const;

/** Beats inside the Terrain shot. */
export const TER = { toTable: SHOTS.terrain.from + 58 } as const;

/** The opening question, over the globe. */
export const TITLE = span(8, CUT.pullBack - 2);

/** Narration captions: one line per beat of the story, named by the page it is on. */
export const CAPTIONS = [
  { ...span(CUT.pullBack + 26, CUT.illum - 5), chip: 'Overview', text: '27 cited sites, lit by the real SPICE Sun' },
  { ...span(CUT.illum + 8, CUT.terrain - 5), chip: 'Illumination & Earth', text: 'Hour by hour: sunlight and Earth line of sight' },
  { ...span(CUT.terrain + 8, CUT.compare - 5), chip: 'Terrain', text: 'Slope and roughness from the 20 m LOLA DEM' },
  { ...span(CUT.compare + 6, CUT.answer - 4), chip: 'Compare', text: 'Say what the mission needs, and its limits' },
  { ...span(CUT.answer + 6, CMP.rise - 2), chip: 'Compare', text: 'Hard limits rule sites out, with the reason' },
  { ...span(CMP.reseat + 6, CUT.data - 5), chip: 'Compare', text: 'One recommended site, with the reasons shown' },
  { ...span(CUT.data + 8, CUT.outro - 5), chip: 'Data', text: 'Every number traces to a NASA source' },
] as const;
