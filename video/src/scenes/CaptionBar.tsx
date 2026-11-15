// Narration caption: the page name as a product-style chip, and one plain sentence under it.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { tw } from '../lib/motion';
import { C, MONO, SANS } from '../theme';

export const CAPTION_DEFAULTS = { chip: 'Overview', text: '', size: 60, bottom: 64 };

export const CaptionBar: React.FC<Partial<typeof CAPTION_DEFAULTS> & { duration: number }> = (props) => {
  const { chip, text, size, bottom, duration } = { ...CAPTION_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const inT = tw(frame, [0, 10], [0, 1], [0, 0, 0.2, 1]);
  const outT = tw(frame, [duration - 8, duration], [1, 0]);
  const vis = inT * outT;
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, background: 'linear-gradient(0deg, rgba(2,3,5,0.94) 0%, rgba(2,3,5,0.82) 38%, rgba(2,3,5,0) 100%)' }} />
      <div style={{ position: 'absolute', left: 96, right: 96, bottom, transform: `translateY(${(1 - inT) * 12}px)` }}>
        <div
          style={{
            display: 'inline-block',
            fontFamily: MONO,
            fontWeight: 600,
            fontSize: 32,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.fg,
            border: `2px solid ${C.control}`,
            borderRadius: 6,
            padding: '5px 14px 6px',
          }}
        >
          {chip}
        </div>
        <div style={{ marginTop: 16, fontFamily: SANS, fontWeight: 500, fontSize: size, lineHeight: 1.12, letterSpacing: '-0.01em', color: C.fgHot }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};
