// The opening question (blur-slide): words arrive one by one, y + blur + opacity on one shared
// progress and one ease; the second line starts before the first has settled.
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { tw } from '../lib/motion';
import { C, MONO, SANS } from '../theme';

export const OPEN_TITLE_DEFAULTS = {
  line1: 'Where should we land',
  line2: 'at the Moon’s south pole?',
  size: 104,
  left: 120,
  top: 104,
};

const WORD = 20; // frames a word takes to arrive
const outCubic = Easing.out(Easing.cubic);

const Line: React.FC<{ words: string[]; start: number; gap: number; dy: number; style: React.CSSProperties }> = ({
  words,
  start,
  gap,
  dy,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', gap: '0.28em', ...style }}>
      {words.map((w, i) => {
        const p = tw(frame, [start + i * gap, start + i * gap + WORD], [0, 1], outCubic);
        return (
          <span key={i} style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const OpenTitle: React.FC<Partial<typeof OPEN_TITLE_DEFAULTS> & { duration: number }> = (props) => {
  const { line1, line2, size, left, top, duration } = { ...OPEN_TITLE_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const out = tw(frame, [duration - 12, duration], [0, 1], [0.4, 0, 1, 1]);
  const scrim = tw(frame, [0, 14], [0, 1]);
  const h1: React.CSSProperties = { fontFamily: SANS, fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.02em', color: C.fgHot };
  // each data hue keeps its product meaning: Sun gold, Earth blue, terrain brown
  const facets: [string, string][] = [
    ['SUNLIGHT', C.sun],
    ['EARTH LINE OF SIGHT', C.earth],
    ['TERRAIN', C.horizon],
  ];
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 6}px)` : undefined }}>
      <AbsoluteFill
        style={{
          opacity: scrim,
          background: 'linear-gradient(122deg, rgba(2,3,5,0.9) 0%, rgba(2,3,5,0.74) 34%, rgba(2,3,5,0.3) 56%, rgba(2,3,5,0) 72%)',
        }}
      />
      <div style={{ position: 'absolute', left, top, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Line words={line1.split(' ')} start={4} gap={3.5} dy={40} style={h1} />
        <Line words={line2.split(' ')} start={13} gap={3.5} dy={40} style={h1} />
        <div style={{ display: 'flex', gap: 22, marginTop: 30, fontFamily: MONO, fontWeight: 600, fontSize: 34, letterSpacing: '0.14em' }}>
          {facets.map(([label, color], i) => {
            const p = tw(frame, [30 + i * 4, 30 + i * 4 + WORD], [0, 1], outCubic);
            return (
              <span key={label} style={{ color, opacity: p, transform: `translateY(${(1 - p) * 26}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
                {i ? <span style={{ color: C.control, marginRight: 22 }}>/</span> : null}
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
