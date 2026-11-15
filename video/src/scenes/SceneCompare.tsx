// S5: Compare, the long beat. Three real page states, reached the way a user reaches them:
//   c0  the default mission            -> Peak near Shackleton 71.3/100, clear lead
//   c1  sunlight marked Critical       -> 74.4/100
//   c2  "longest darkness: 7 days"     -> the other two sites are excluded, with the reason
// A: cursor performance on the mission questions (input-trigger-moves, style A).
// B: the recommendation card is singled out (spotlight-hero-card): the spotlight locks, the
//    camera swings to a side view, the card lifts, a beam runs its outline twice, it reseats.
import { AbsoluteFill, Easing, staticFile, useCurrentFrame } from 'remotion';
import { Cam, CamKey, camAt } from '../lib/Cam';
import { Handoff } from '../lib/Handoff';
import { tw } from '../lib/motion';
import { CMP, SHOTS } from '../timeline';
import { C } from '../theme';

const PAGE_W = 1120; // captured at a 1120 px window, 3x
const PAGE_H = 2300;
const L = (abs: number) => abs - SHOTS.compare.from; // absolute frame -> local frame

// ---- A: the interaction, in local frames ----
const T = {
  cursorIn: L(CMP.cursorIn),
  hover: L(CMP.hover),
  click: L(CMP.click), // "Critical"
  toField: L(CMP.toField),
  field: L(CMP.field), // the darkness field takes focus
  typed: L(CMP.typed), // "7"
  enter: L(CMP.enter), // committed on the beat the drums enter
};
const SHIFT = 13.2; // c1 adds a "Reset answers" button: the page itself moves everything below down this far
const CRITICAL = { x: 1017.7, y: 180.7, w: 66.3, h: 28 }; // in c0
const FIELD = { x: 299.5, y: 408.3, w: 221.4, h: 32 }; // in c1/c2

// ---- B: the recommendation card, in local frames ----
const LOCK = L(CMP.lock); // the camera has reached the card, flat: read it
const PUSH_AT = L(CMP.pushAt); // then swing to the side view
const RISE = L(CMP.rise);
const HOVER = L(CMP.hover2);
const RESEAT = L(CMP.reseat);
const LAND = L(CMP.land);
const CARD = { x: 16, y: 706.1, w: 1088, h: 531.3 }; // .card.recommendation in c2
const RADIUS = 8;
const LIFT = 70;

const PUSH = Easing.bezier(0.35, 0, 0.2, 1);
// Flat framing of the recommendation: the card's ranking rows (with the "Excluded: ..." reasons)
// sit above the caption band.
const CARD_VIEW = { cx: 560, cy: 992, zoom: 1.714, rotX: 0, rotY: 0, rotZ: 0 };
const SIDE_VIEW = { cx: 452, cy: 930, zoom: 1.9, rotX: 5, rotY: 15, rotZ: 0.6 }; // from the left
const KEYS: CamKey[] = [
  { frame: 0, cx: 560, cy: 322, zoom: 1.68, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 }, // questions and limits in one frame
  { frame: T.enter + 2, cx: 560, cy: 316, zoom: 1.714 },
  { frame: LOCK, ...CARD_VIEW },
  { frame: PUSH_AT, ...CARD_VIEW },
  { frame: RISE, ...SIDE_VIEW },
  { frame: RESEAT + 4, ...SIDE_VIEW },
  { frame: LAND + 6, ...CARD_VIEW },
  { frame: 400, ...CARD_VIEW },
];

const Cursor: React.FC<{ x: number; y: number; opacity: number }> = ({ x, y, opacity }) => (
  <svg
    width={52}
    height={52}
    viewBox="0 0 28 28"
    style={{ position: 'absolute', left: x - 3.7, top: y - 1.9, opacity, filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.6))' }}
  >
    <path d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z" fill="#ffffff" stroke="#10151c" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const bez = (t: number, p: { x: number; y: number }[]) => {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
};

export const SceneCompare: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const cam = camAt(KEYS, frame, PUSH);
  const toScreen = (p: { x: number; y: number }) => ({ x: 960 + (p.x - cam.cx) * cam.zoom, y: 540 + (p.y - cam.cy) * cam.zoom });

  // ---- page state: which real capture is on screen ----
  const toC1 = tw(frame, [T.click, T.click + 3], [0, 1]);
  const toC2 = tw(frame, [T.enter, T.enter + 4], [0, 1]);
  const layers =
    frame < T.click
      ? [{ src: 'textures/cmp-c0.png', opacity: 1 }]
      : frame < T.click + 3
        ? [
            { src: 'textures/cmp-c0.png', opacity: 1 },
            { src: 'textures/cmp-c1.png', opacity: toC1 },
          ]
        : frame < T.field
          ? [{ src: 'textures/cmp-c1.png', opacity: 1 }]
          : frame < T.typed
            ? [{ src: 'textures/cmp-c2focus.png', opacity: 1 }]
            : frame < T.enter
              ? [{ src: 'textures/cmp-c2typed.png', opacity: 1 }]
              : frame < T.enter + 4
                ? [
                    { src: 'textures/cmp-c2typed.png', opacity: 1 },
                    { src: 'textures/cmp-c2.png', opacity: toC2 },
                  ]
                : [{ src: 'textures/cmp-c2.png', opacity: 1 }];

  // ---- A: cursor. Bezier glide in with a wrist overshoot, hover, click, then on to the field ----
  // the pointer does not move when the page shifts under it
  const criticalAt = { x: CRITICAL.x + CRITICAL.w * 0.55, y: CRITICAL.y + CRITICAL.h * 0.6 };
  const fieldAt = { x: FIELD.x + 46, y: FIELD.y + FIELD.h * 0.6 };
  const target1 = toScreen(criticalAt);
  const glide = frame < T.hover - 6 ? tw(frame, [T.cursorIn, T.hover - 6], [0, 1.05], Easing.out(Easing.cubic)) : tw(frame, [T.hover - 6, T.hover], [1.05, 1], Easing.inOut(Easing.quad));
  let cur = bez(glide, [
    { x: 1500, y: 1180 },
    { x: 1760, y: 900 },
    { x: target1.x + 150, y: target1.y + 190 },
    target1,
  ]);
  if (frame >= T.toField) {
    const go = tw(frame, [T.toField, T.field - 2], [0, 1], [0.3, 0, 0.2, 1]);
    const target2 = toScreen(fieldAt);
    cur = { x: target1.x + (target2.x - target1.x) * go, y: target1.y + (target2.y - target1.y) * go - Math.sin(go * Math.PI) * 40 };
  }
  const dip = tw(frame, [T.click, T.click + 2, T.click + 6], [0, 3, 0]) + tw(frame, [T.field, T.field + 2, T.field + 6], [0, 3, 0]);
  const cursorOpacity = tw(frame, [T.cursorIn, T.cursorIn + 4], [0, 1]) * tw(frame, [T.enter + 2, T.enter + 10], [1, 0]);

  // hover lift on the button, and the click ripple (spread and fade on separate curves)
  const hover = tw(frame, [T.hover, T.hover + 4], [0, 1]) * (frame < T.click + 3 ? 1 : 0);
  const ripples = [
    { at: T.click, p: target1 },
    { at: T.field, p: toScreen(fieldAt) },
  ];

  // ---- B: spotlight, lift, beam ----
  const rise = tw(frame, [RISE, HOVER], [0, 1], [0.2, 1.25, 0.3, 1]);
  const reseat = tw(frame, [RESEAT, LAND], [0, 1], [0.4, 0, 0.3, 1.05]);
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - HOVER) / 40) * Math.PI * 2) * 3 * lift;
  const z = LIFT * lift + bob;
  const landed = frame >= LAND;
  const press = tw(frame, [LAND - 4, LAND - 1, LAND], [1, 0.997, 1]);
  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = tw(frame, [LAND - 4, LAND, LAND + 4], [0, 1, 0]);
  const slotEdge = Math.min(1, 0.4 * (1 - reseat)) + landPulse * 0.6;
  const beam1 = tw(frame, [HOVER + 2, HOVER + 16], [0, 1]);
  const beam1On = frame >= HOVER + 1 && frame <= HOVER + 17;
  const beam2 = tw(frame, [HOVER + 22, HOVER + 42], [0, 1], [0.4, 0, 0.4, 1]);
  const beam2On = frame >= HOVER + 21 && frame <= HOVER + 43;
  const trail = tw(frame, [HOVER + 42, HOVER + 54], [0.35, 0]);
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  // roving spotlight: waypoints while the camera travels down, then locks on the card
  const spotOn = tw(frame, [T.enter + 4, T.enter + 12], [0, 1]) * tw(frame, [LAND + 2, LAND + 16], [1, 0]);
  const stations = [T.enter + 4, T.enter + 9, T.enter + 14, T.enter + 19, LOCK, RISE];
  const spotEase = Easing.bezier(0.4, 0, 0.3, 1);
  const spotX = tw(frame, stations, [28, 28, 68, 40, 46, 44], spotEase);
  const spotY = tw(frame, stations, [34, 34, 46, 58, 40, 44], spotEase);
  const poolBase = tw(frame, [T.enter + 16, LOCK, RISE], [820, 640, 540], spotEase);
  const pool = poolBase * (1 + tw(frame, [LOCK, LOCK + 4, LOCK + 9], [0, 0.06, 0]));
  const vignette = tw(frame, [T.enter + 16, LOCK, RISE], [0.16, 0.34, 0.5]);

  const texture = staticFile('textures/cmp-c2.png');

  return (
    <Handoff frame={frame} duration={duration}>
      <Cam src="" layers={layers} pageW={PAGE_W} pageH={PAGE_H} keys={KEYS} ease={PUSH}>
        {hover > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: CRITICAL.x,
              top: CRITICAL.y + toC1 * SHIFT,
              width: CRITICAL.w,
              height: CRITICAL.h,
              borderRadius: 5,
              background: C.fgHot,
              opacity: 0.1 * hover,
            }}
          />
        ) : null}

        {frame >= RISE - 2 && frame <= LAND + 6 ? (
          <div style={{ transformStyle: 'preserve-3d' }}>
            {/* the vacated slot: page background and a quiet outline */}
            {slotVis > 0.02 ? (
              <div
                style={{
                  position: 'absolute',
                  left: CARD.x - 1,
                  top: CARD.y - 1,
                  width: CARD.w + 2,
                  height: CARD.h + 2,
                  background: C.plate,
                  borderRadius: RADIUS,
                  opacity: slotVis,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, border: `1px solid ${C.fgPress}`, opacity: slotEdge }} />
              </div>
            ) : null}

            {/* the card itself: a crop of the real capture, never a redraw */}
            <div
              style={{
                position: 'absolute',
                left: CARD.x,
                top: CARD.y,
                width: CARD.w,
                height: CARD.h,
                transform: `translateZ(${z}px) scale(${press})`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: RADIUS,
                  overflow: 'hidden',
                  backgroundImage: `url(${texture})`,
                  backgroundSize: `${PAGE_W}px ${PAGE_H}px`,
                  backgroundPosition: `-${CARD.x}px -${CARD.y}px`,
                  boxShadow: landed ? 'none' : `0 ${8 * lift}px ${10 + 12 * lift}px rgba(0,0,0,${0.5 * lift}), 0 ${46 * lift}px ${90 * lift}px rgba(0,0,0,${0.6 * lift})`,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.06), transparent 40%)', opacity: lift }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, boxShadow: `inset 0 0 0 1px rgba(230,234,239,${0.5 * lift})` }} />

              {(beam1On || beam2On) && lift > 0.4 ? (
                <svg
                  width={bw}
                  height={bh}
                  viewBox={`0 0 ${bw} ${bh}`}
                  style={{
                    position: 'absolute',
                    left: -3,
                    top: -3,
                    overflow: 'visible',
                    opacity: beam1On ? 1 : 0.62,
                    filter: 'drop-shadow(0 0 5px rgba(230,234,239,0.9)) drop-shadow(0 0 16px rgba(195,203,214,0.5))',
                  }}
                >
                  <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={C.fgPress} strokeWidth={beam1On ? 4 : 2.8} strokeLinecap="round" pathLength={1} strokeDasharray="0.14 1" strokeDashoffset={-(beam1On ? beam1 : beam2)} />
                  <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke="#ffffff" strokeWidth={beam1On ? 2 : 1.4} strokeLinecap="round" pathLength={1} strokeDasharray="0.14 1" strokeDashoffset={-(beam1On ? beam1 : beam2)} />
                </svg>
              ) : null}
              {trail > 0.01 && frame >= HOVER + 42 ? (
                <div style={{ position: 'absolute', inset: -2, borderRadius: RADIUS + 2, border: `1px solid ${C.fgPress}`, opacity: trail }} />
              ) : null}
            </div>
          </div>
        ) : null}
      </Cam>

      {/* spotlight: a cool pool on the card, the rest of the page held back */}
      {spotOn > 0.001 ? (
        <AbsoluteFill
          style={{
            opacity: spotOn,
            background: `radial-gradient(${pool}px ${pool * 0.62}px at ${spotX}% ${spotY}%, rgba(230,234,239,0.07), rgba(230,234,239,0.02) 45%, rgba(0,0,0,${vignette}) 100%)`,
          }}
        />
      ) : null}

      {/* click ripples */}
      {ripples.map((r, i) =>
        frame >= r.at && frame < r.at + 26 ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.p.x,
              top: r.p.y,
              width: tw(frame, [r.at, r.at + 22], [28, 170], Easing.out(Easing.cubic)),
              height: tw(frame, [r.at, r.at + 22], [28, 170], Easing.out(Easing.cubic)),
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: `${tw(frame, [r.at, r.at + 22], [5, 1.5])}px solid ${C.fgHot}`,
              opacity: tw(frame, [r.at, r.at + 26], [0.9, 0]),
            }}
          />
        ) : null,
      )}
      {cursorOpacity > 0 ? <Cursor x={cur.x} y={cur.y + dip} opacity={cursorOpacity} /> : null}
    </Handoff>
  );
};
