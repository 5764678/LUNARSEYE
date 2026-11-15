// S7: the wordmark (letterspace-materialize). Every letter starts on the same frame, is drawn as
// one continuous stroke, and finishes on the same frame; then nothing moves for two seconds.
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { tw } from '../lib/motion';
import { CUT, SHOTS } from '../timeline';
import { C, MONO, SANS } from '../theme';

export const OUTRO_DEFAULTS = {
  word: 'LUNARSEYE',
  tagline: 'lunar south-pole site analysis',
  byline: 'Project by',
  authors: 'Thammapat Deeswasmongkol, Jinn Sawasdivorn',
  credit: 'NASA Space Apps Challenge 2026',
  url: 'lunarseye.onrender.com',
};

// single-stroke skeleton letterforms in a 78 x 64 box (sub-path order = drawing order)
const GLYPHS: Record<string, string> = {
  L: 'M 14 5 L 14 59 L 64 59',
  U: 'M 12 5 L 12 40 C 12 59, 66 59, 66 40 L 66 5',
  N: 'M 12 59 L 12 5 L 66 59 L 66 5',
  A: 'M 7 59 L 39 5 L 71 59 M 17 41 L 61 41',
  R: 'M 12 59 L 12 5 L 44 5 C 64 5, 64 31, 44 31 L 12 31 M 42 31 L 64 59',
  S: 'M 62 13 C 51 4, 18 3, 15 15 C 12 26, 29 29, 39 31 C 50 33, 66 37, 63 48 C 60 59, 21 61, 11 50',
  E: 'M 62 5 L 12 5 L 12 59 L 62 59 M 12 31 L 56 31',
  Y: 'M 9 5 L 39 34 L 69 5 M 39 34 L 39 59',
};

const DRAW = 50;
const DONE = CUT.wordmark - SHOTS.outro.from; // the last stroke closes on a beat
const START = DONE - DRAW;
const SCALE = 1.5;

export const SceneOutro: React.FC<Partial<typeof OUTRO_DEFAULTS>> = (props) => {
  const { word, tagline, byline, authors, credit, url } = { ...OUTRO_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const fade = tw(frame, [0, 12], [0, 1]);
  const p = tw(frame, [START, DONE], [0, 1]);
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const doneGlow = tw(frame, [DONE, DONE + 8], [1, 0]);
  const glow = p >= 1 ? doneGlow : p > 0.7 ? (p - 0.7) / 0.3 : 0;
  const line = (at: number) => {
    const t = tw(frame, [at, at + 16], [0, 1], [0, 0, 0.2, 1]);
    return { opacity: t, transform: `translateY(${(1 - t) * 14}px)` };
  };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity: fade }}>
      {/* the film's first image, held back: the Moon the product draws */}
      <AbsoluteFill style={{ opacity: 0.75, filter: 'blur(4px) brightness(0.6)' }}>
        <Img
          src={staticFile('seq/ov/f0176.png')}
          style={{ position: 'absolute', width: 1920, height: 1080, transform: 'translate(-1740px, -635px) scale(2.5)', transformOrigin: '0 0' }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(1100px 620px at 50% 46%, rgba(5,7,10,0.55), rgba(5,7,10,0.9) 100%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 34 * SCALE, alignItems: 'center', marginTop: -30 }}>
          {word.split('').map((ch, i) => (
            <svg key={i} width={78 * SCALE} height={64 * SCALE} viewBox="0 0 78 64" style={{ overflow: 'visible', display: 'block' }}>
              {p > 0 && GLYPHS[ch] ? (
                <path
                  d={GLYPHS[ch]}
                  fill="none"
                  stroke={C.fgHot}
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - e}
                  style={{ filter: `drop-shadow(0 0 ${6 + glow * 10}px rgba(230,234,239,${0.3 + glow * 0.35}))` }}
                />
              ) : null}
            </svg>
          ))}
        </div>
        <div style={{ ...line(DONE - 8), marginTop: 50, fontFamily: MONO, fontSize: 40, letterSpacing: '0.08em', color: C.fg }}>{tagline}</div>
        <div style={{ ...line(DONE - 3), marginTop: 76, display: 'flex', alignItems: 'baseline', gap: 20, fontFamily: SANS, fontSize: 38, color: C.fgHot }}>
          <span style={{ fontFamily: MONO, fontSize: 32, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{byline}</span>
          <span style={{ fontWeight: 500 }}>{authors}</span>
        </div>
        <div style={{ ...line(DONE + 2), marginTop: 30, display: 'flex', gap: 24, fontFamily: MONO, fontSize: 32, letterSpacing: '0.04em', color: C.fgPress }}>
          <span>{credit}</span>
          <span style={{ color: C.control }}>/</span>
          <span style={{ color: C.fgHot }}>{url}</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
