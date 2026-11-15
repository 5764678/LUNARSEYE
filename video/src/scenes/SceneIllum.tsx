// S3: Illumination & Earth. The sky chart plays (Sun and Earth against the terrain skyline), then
// the camera drops to the Sunlight table and a reticle locks onto the row that makes the point:
// terrain horizon versus a flat Moon (fui-hud-moves, style B reticle-lock-on).
import { Easing, useCurrentFrame } from 'remotion';
import { Cam, CamKey } from '../lib/Cam';
import { Handoff } from '../lib/Handoff';
import { pad4, tw } from '../lib/motion';
import { C, MONO } from '../theme';
import { ILL, SHOTS } from '../timeline';

export const ILLUM_FRAMES = 125;
export const ILLUM_DEFAULTS = { label: 'TERRAIN 73.5 %  ·  FLAT 57.3 %' };

const KEYS: CamKey[] = [
  { frame: 0, cx: 1104, cy: 502, zoom: 1.18 }, // the sky chart, edge to edge, from just under the top bar
  { frame: ILL.toTable - SHOTS.illum.from, cx: 1104, cy: 502, zoom: 1.18 },
  { frame: ILL.toTable - SHOTS.illum.from + 18, cx: 850, cy: 745, zoom: 1.75 }, // the Sunlight table
  { frame: 125, cx: 850, cy: 745, zoom: 1.75 },
];

// "Time with direct sunlight" row of the Sunlight table (src/layout/il.json)
const ROW = { x: 321, y: 715.2, w: 760, h: 33 };
const PAD = 5;
const FLY_IN = ILL.flyIn - SHOTS.illum.from;
const FLY_END = FLY_IN + 10;
const LOCK = ILL.lock - SHOTS.illum.from;
const ARM = 20;
const THICK = 2.5;

export const SceneIllum: React.FC<Partial<typeof ILLUM_DEFAULTS> & { duration: number }> = (props) => {
  const { label, duration } = { ...ILLUM_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const shot = Math.min(frame, ILLUM_FRAMES - 1);

  const cxT = ROW.x + ROW.w / 2;
  const cyT = ROW.y + ROW.h / 2;
  const fly = tw(frame, [FLY_IN, FLY_END], [0, 1], Easing.out(Easing.cubic));
  const shrink = tw(frame, [FLY_END, LOCK - 8, LOCK - 3, LOCK], [2.2, 1.06, 0.94, 1], Easing.inOut(Easing.cubic));
  const hw = (ROW.w / 2 + PAD) * shrink;
  const hh = (ROW.h / 2 + PAD) * shrink;
  // lock frame: the row brightens a touch and the label lands on the same frame
  const glow = tw(frame, [LOCK, LOCK + 3, LOCK + 10], [0, 0.16, 0.07]);
  const labelT = tw(frame, [LOCK + 2, LOCK + 12], [0, 1], Easing.out(Easing.back(1.8)));
  const corners = [
    { x: cxT - hw, y: cyT - hh, sx: 1, sy: 1 },
    { x: cxT + hw, y: cyT - hh, sx: -1, sy: 1 },
    { x: cxT - hw, y: cyT + hh, sx: 1, sy: -1 },
    { x: cxT + hw, y: cyT + hh, sx: -1, sy: -1 },
  ];

  return (
    <Handoff frame={frame} duration={duration}>
      <Cam src={`seq/il/f${pad4(shot)}.png`} pageH={1080} keys={KEYS}>
        {/* on lock, everything but the row steps back so the label has a quiet place to land */}
        {frame >= LOCK - 3
          ? [
              { left: 0, top: 0, width: 1920, height: ROW.y - PAD },
              { left: 0, top: ROW.y + ROW.h + PAD, width: 1920, height: 1080 - ROW.y - ROW.h - PAD },
              { left: 0, top: ROW.y - PAD, width: ROW.x - PAD, height: ROW.h + PAD * 2 },
              { left: ROW.x + ROW.w + PAD, top: ROW.y - PAD, width: 1920 - ROW.x - ROW.w - PAD, height: ROW.h + PAD * 2 },
            ].map((box, i) => (
              <div key={i} style={{ position: 'absolute', ...box, background: C.plate, opacity: tw(frame, [LOCK - 3, LOCK + 5], [0, 0.62]) }} />
            ))
          : null}
        {frame >= LOCK ? (
          <div
            style={{
              position: 'absolute',
              left: ROW.x - PAD,
              top: ROW.y - PAD,
              width: ROW.w + PAD * 2,
              height: ROW.h + PAD * 2,
              borderRadius: 4,
              background: C.fgHot,
              opacity: glow,
            }}
          />
        ) : null}
        {frame >= FLY_IN ? (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(1 - fly) * 640}px, ${(1 - fly) * 360}px)` }}>
            {corners.map((c, i) => (
              <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, transform: `scale(${c.sx}, ${c.sy})`, transformOrigin: '0 0' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: ARM, height: THICK, background: C.fgHot }} />
                <div style={{ position: 'absolute', left: 0, top: 0, width: THICK, height: ARM, background: C.fgHot }} />
              </div>
            ))}
            {frame >= LOCK + 2 ? (
              <div
                style={{
                  position: 'absolute',
                  left: cxT - hw,
                  top: cyT + hh + 12,
                  transform: `scale(${labelT})`,
                  transformOrigin: '0 0',
                  opacity: Math.min(1, labelT * 1.5),
                  background: C.fgHot,
                  color: C.bg,
                  fontFamily: MONO,
                  fontWeight: 600,
                  fontSize: 19,
                  letterSpacing: '0.06em',
                  padding: '7px 12px',
                  borderRadius: 4,
                  whiteSpace: 'pre',
                }}
              >
                {label}
              </div>
            ) : null}
          </div>
        ) : null}
      </Cam>
    </Handoff>
  );
};
