// S6: Data. The four dataset records drop out of the air and seat into the page (row-embed):
// each tilts flat as it lands, and its bottom edge flashes once in the product's "verified" green.
import { Easing, staticFile, useCurrentFrame } from 'remotion';
import { Cam, CamKey } from '../lib/Cam';
import { Handoff } from '../lib/Handoff';
import { tw } from '../lib/motion';
import { HAND } from '../timeline';
import { C } from '../theme';

const PAGE_W = 1120;
const PAGE_H = 1400;
// section.card boxes of /data (src/layout/dat-d0.json)
const ROWS = [94.8, 281.2, 467.5, 653.8].map((y) => ({ x: 16, y, w: 1088, h: 174.3 }));
const FIRST = HAND; // the first record is already in the air as the page arrives
const KEYS: CamKey[] = [
  { frame: 0, cx: 560, cy: 420, zoom: 1.45 },
  { frame: FIRST + 62, cx: 560, cy: 462, zoom: 1.45 }, // all four records in frame as the last one seats
];
const FLY = Easing.bezier(0.3, 0, 0.25, 1);

export const SceneData: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const src = staticFile('textures/dat-d0.png');
  return (
    <Handoff frame={frame} duration={duration}>
      <Cam src="textures/dat-d0.png" pageW={PAGE_W} pageH={PAGE_H} keys={KEYS} ease={(t) => t}>
        {ROWS.map((r, i) => {
          const cue = FIRST + i * 9;
          const land = cue + 12;
          const patch = tw(frame, [land, land + 2], [1, 0]);
          const p = tw(frame, [cue, land], [0, 1], FLY);
          const air = 1 - p;
          const scale = frame < land ? 1.06 - 0.065 * p : tw(frame, [land, land + 4], [0.995, 1], Easing.out(Easing.quad));
          const spread = tw(frame, [land, land + 5], [0, 1], Easing.out(Easing.cubic));
          const seamW = (r.w - 16) * spread;
          return (
            <div key={i}>
              {patch > 0 ? (
                <div style={{ position: 'absolute', left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, background: C.bg, opacity: patch }} />
              ) : null}
              {frame >= cue && frame < cue + 16 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: r.x,
                    top: r.y,
                    width: r.w,
                    height: r.h,
                    borderRadius: 8,
                    backgroundColor: C.panel,
                    backgroundImage: `url(${src})`,
                    backgroundSize: `${PAGE_W}px ${PAGE_H}px`,
                    backgroundPosition: `-${r.x}px -${r.y}px`,
                    opacity: tw(frame, [cue, cue + 3], [0, 1]),
                    transform: `perspective(900px) translateY(${-120 * air}px) rotateX(${16 * air}deg) scale(${scale})`,
                    boxShadow: `0 ${30 * air}px ${60 * air}px rgba(0,0,0,${0.6 * air}), 0 ${8 * air}px ${16 * air}px rgba(0,0,0,${0.4 * air})`,
                    zIndex: 3,
                  }}
                />
              ) : null}
              {frame >= land && frame < land + 8 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: r.x + (r.w - seamW) / 2,
                    top: r.y + r.h - 2,
                    width: seamW,
                    height: 2,
                    background: C.ok,
                    boxShadow: `0 0 6px ${C.ok}88`,
                    opacity: tw(frame, [land, land + 2, land + 8], [1, 1, 0]),
                    zIndex: 4,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </Cam>
    </Handoff>
  );
};
