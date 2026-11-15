// origin: assets/lib/PageCam.tsx of the video-shotcraft skill, adapted: dark page background, a
// page width other than 1920, and a texture that may change every frame (live page sequences).
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C } from '../theme';

export type CamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  persp?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const camAt = (keys: CamKey[], frame: number, ease: (t: number) => number) => {
  let a = keys[0];
  let b = keys[keys.length - 1];
  if (frame <= keys[0].frame) b = a;
  else if (frame >= b.frame) a = b;
  else
    for (let i = 0; i < keys.length - 1; i++) {
      if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
  const t =
    a.frame === b.frame
      ? 1
      : interpolate(frame, [a.frame, b.frame], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    zoom: lerp(a.zoom, b.zoom, t),
    rotX: lerp(a.rotX ?? 0, b.rotX ?? 0, t),
    rotY: lerp(a.rotY ?? 0, b.rotY ?? 0, t),
    rotZ: lerp(a.rotZ ?? 0, b.rotZ ?? 0, t),
    persp: lerp(a.persp ?? 1400, b.persp ?? 1400, t),
  };
};

/**
 * 2.5D camera over a page capture. (cx, cy) is the page-space CSS point centred in the frame;
 * zoom is output px per CSS px. Children are positioned in page CSS px, under the same camera.
 * With any 3D key the magnification goes through the CSS `zoom` property (layout-level), so the
 * tilted page is rasterised from the hi-res capture instead of being upscaled.
 */
export const Cam: React.FC<{
  src: string | string[]; // later entries are drawn on top (state crossfades use `layers`)
  layers?: { src: string; opacity: number }[];
  pageW?: number;
  pageH: number;
  keys: CamKey[];
  children?: React.ReactNode;
  ease?: (t: number) => number;
  frame?: number;
}> = ({ src, layers, pageW = 1920, pageH, keys, children, ease = Easing.bezier(0.33, 0, 0.15, 1), frame: frameProp }) => {
  const own = useCurrentFrame();
  const frame = frameProp ?? own;
  const { cx, cy, zoom, rotX, rotY, rotZ, persp } = camAt(keys, frame, ease);
  const has3D = keys.some((k) => k.rotX !== undefined || k.rotY !== undefined || k.rotZ !== undefined || k.persp !== undefined);
  const stack = layers ?? (Array.isArray(src) ? src : [src]).map((s) => ({ src: s, opacity: 1 }));
  const images = stack
    .filter((l) => l.opacity > 0.001)
    .map((l) => (
      <Img key={l.src} src={staticFile(l.src)} style={{ position: 'absolute', width: pageW, height: pageH, opacity: l.opacity }} />
    ));

  if (!has3D) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: C.bg }}>
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            transform: `translate(${960 - cx * zoom}px, ${540 - cy * zoom}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {images}
          {children}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: C.bg }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${persp * zoom}px`, perspectiveOrigin: '960px 540px' }}>
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            zoom,
            transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transformStyle: 'preserve-3d',
          }}
        >
          {images}
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
