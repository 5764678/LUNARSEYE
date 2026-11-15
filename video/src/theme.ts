// Design tokens lifted from the product (apps/web/src/app/tokens.css). The film adds no colour
// of its own: chrome is neutral, and each hue keeps the one meaning the product gives it.
export const C = {
  bg: '#05070a',
  panel: '#0b0f14',
  panelRaised: '#10151c',
  plate: '#020305',
  fg: '#e6eaef',
  fgHot: '#f4f7fa',
  fgPress: '#c3cbd6',
  muted: '#8d97a6',
  line: '#1c232d',
  lineStrong: '#2a3441',
  control: '#667180',
  sun: '#ffd166', // the Sun
  earth: '#6cc3ff', // the Earth
  horizon: '#b08968', // terrain
  ok: '#46d19f', // clear, verified
  caution: '#ff9a52', // assumed
} as const;

export const SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

// Motion voice: precise and unhurried ("professional trust" preset). Entrances decelerate and do
// not bounce; the only overshoot in the film is the recommended-site card landing.
export const EASE_IN = [0, 0, 0.2, 1] as const; // entrances
export const EASE_CAM = [0.33, 0, 0.15, 1] as const; // camera moves
