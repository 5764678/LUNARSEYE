// Sound, in one table. Music sets the energy; each effect is pinned to the frame of the picture
// it belongs to, written relative to the shot it lives in, never as a bare frame number.
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
import { CMP, CUT, FPS, ILL, OUTPUT_AUDIO_OFFSET_SEC, SHOTS, TER, TITLE, TOTAL } from './timeline';

export const BGM = { src: 'audio/bgm.mp3', volume: 0.34 };

/** Frames from the start of each file to its loudest instant (measured, see analysis/). */
const PEAK_F: Record<string, number> = {
  'transition-soft.mp3': 13.6,
  'whoosh-big.mp3': 21.4,
  'whoosh-fast.mp3': 21.6,
  'swoosh-quick.mp3': 8.3,
  'sweep-short.mp3': 13.9,
  'transition-snap.mp3': 3.5,
  'lock-quick.mp3': 0.4,
  'switch-click-quick.mp3': 0.2,
  'switch-tap.mp3': 0.1,
  'keyboard.mp3': 0.2,
  'sparkle.mp3': 44.3,
  'impact-deep-whoosh.mp3': 18.9,
  'riser-cine.mp3': 0, // a ramp: pinned by its start
};

/** Start frame that puts a file's peak on `target`, less the render pipeline's audio delay. */
const at = (target: number, src: string) => Math.max(0, Math.round(target - (PEAK_F[src] ?? 0) - OUTPUT_AUDIO_OFFSET_SEC * FPS));

type Cue = { from: number; src: string; volume: number; duration?: number };
const cue = (target: number, src: string, volume: number, duration?: number): Cue => ({ from: at(target, src), src, volume, duration });

export const SFX: Cue[] = [
  // opening and Overview
  cue(TITLE.from + 8, 'transition-soft.mp3', 0.3), // the question arrives
  cue(CUT.pullBack + 10, 'whoosh-big.mp3', 0.36), // pull back out of the globe to the whole page
  cue(CUT.pullBack + 64, 'swoosh-quick.mp3', 0.26), // in to the timeline lanes
  // Illumination & Earth
  cue(CUT.illum, 'transition-soft.mp3', 0.3), // page handoff
  cue(ILL.flyIn + 6, 'sweep-short.mp3', 0.3), // the reticle flies in
  cue(ILL.lock, 'lock-quick.mp3', 0.5), // and bites: terrain 73.5 %, flat 57.3 %
  // Terrain
  cue(CUT.terrain, 'transition-soft.mp3', 0.3), // page handoff
  cue(TER.toTable + 9, 'swoosh-quick.mp3', 0.24), // down to slope and roughness
  // Compare: the interaction
  cue(CUT.compare, 'transition-soft.mp3', 0.3), // page handoff
  cue(CMP.click, 'switch-click-quick.mp3', 0.5), // sunlight: Critical
  cue(CMP.field, 'switch-tap.mp3', 0.36), // the darkness limit takes focus
  cue(CMP.typed, 'keyboard.mp3', 0.5, 5), // "7"
  cue(CMP.enter - 1, 'keyboard.mp3', 0.6, 6), // Enter
  // Compare: the recommendation
  cue(CMP.enter + 12, 'whoosh-fast.mp3', 0.55), // down to the answer, as the drums enter
  cue(CMP.rise + 4, 'whoosh-big.mp3', 0.4), // the card lifts
  cue(CMP.hover2 + 9, 'sparkle.mp3', 0.45), // the beam runs its outline
  cue(CMP.land, 'transition-snap.mp3', 0.6), // it reseats
  // Data
  cue(CUT.data, 'transition-soft.mp3', 0.3), // page handoff; the records seat without a pop each
  // wordmark: riser, impact, afterglow
  { from: CUT.outro - 12, src: 'riser-cine.mp3', volume: 0.26, duration: CUT.wordmark - (CUT.outro - 12) },
  cue(CUT.wordmark, 'impact-deep-whoosh.mp3', 0.42), // the last stroke closes
  cue(CUT.wordmark + 26, 'sparkle.mp3', 0.32),
];

export const sfxDuration = (c: Cue) => c.duration ?? 150;

export const Soundtrack: React.FC<{ bgm: boolean }> = ({ bgm }) => (
  <>
    {bgm ? (
      <Audio
        src={staticFile(BGM.src)}
        volume={(f) => interpolate(f, [0, 30, TOTAL - 50, TOTAL], [0, BGM.volume, BGM.volume, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    ) : null}
    {SFX.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={sfxDuration(c)}>
        <Audio src={staticFile(`audio/${c.src}`)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);
