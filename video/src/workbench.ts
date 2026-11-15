// Workbench manifest: how the film decomposes into editable clips.
//
// The shotcraft workbench (`node workbench/scripts/open.mjs <this project>`) reads `WORKBENCH`
// and rebuilds the film as tracks: shots, captions, sound. Every table here is imported from
// timeline.ts / Soundtrack.tsx, so there is no second copy of the timing to drift.
// Copy is editable; motion timing (cues, eases, camera keys) is deliberately not exposed.
import { Main } from './Main';
import { BGM, SFX, sfxDuration } from './Soundtrack';
import { CaptionBar, CAPTION_DEFAULTS } from './scenes/CaptionBar';
import { OpenTitle, OPEN_TITLE_DEFAULTS } from './scenes/OpenTitle';
import { SceneCompare } from './scenes/SceneCompare';
import { SceneData } from './scenes/SceneData';
import { SceneIllum, ILLUM_DEFAULTS } from './scenes/SceneIllum';
import { SceneOutro, OUTRO_DEFAULTS } from './scenes/SceneOutro';
import { SceneOverview } from './scenes/SceneOverview';
import { SceneTerrain } from './scenes/SceneTerrain';
import { C } from './theme';
import { CAPTIONS, FPS, HEIGHT, SHOTS, TITLE, TOTAL, WIDTH } from './timeline';

type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };
const text = (key: string, label: string, def: string): Field => ({ type: 'text', key, label, default: def });
const size = (key: string, label: string, def: number, min: number, max: number): Field => ({ type: 'slider', key, label, default: def, min, max, step: 1, unit: 'px' });

export const WORKBENCH = {
  name: 'LUNARSEYE · NASA Space Apps 2026',
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  total: TOTAL,
  background: C.bg,
  shots: [
    { id: 'overview', label: 'S1–2 Opening + Overview', ...SHOTS.overview, component: SceneOverview, props: { duration: SHOTS.overview.duration }, durationProp: 'duration' },
    {
      id: 'illum',
      label: 'S3 Illumination & Earth',
      ...SHOTS.illum,
      component: SceneIllum,
      props: { duration: SHOTS.illum.duration, label: ILLUM_DEFAULTS.label },
      schema: [text('label', 'Reticle label', ILLUM_DEFAULTS.label)],
      durationProp: 'duration',
    },
    { id: 'terrain', label: 'S4 Terrain', ...SHOTS.terrain, component: SceneTerrain, props: { duration: SHOTS.terrain.duration }, durationProp: 'duration' },
    { id: 'compare', label: 'S5 Compare', ...SHOTS.compare, component: SceneCompare, props: { duration: SHOTS.compare.duration }, durationProp: 'duration' },
    { id: 'data', label: 'S6 Data', ...SHOTS.data, component: SceneData, props: { duration: SHOTS.data.duration }, durationProp: 'duration' },
    {
      id: 'outro',
      label: 'S7 Wordmark',
      ...SHOTS.outro,
      component: SceneOutro,
      props: { ...OUTRO_DEFAULTS },
      schema: [
        text('word', 'Wordmark (letters L U N A R S E Y)', OUTRO_DEFAULTS.word),
        text('tagline', 'Tagline', OUTRO_DEFAULTS.tagline),
        text('byline', 'Byline label', OUTRO_DEFAULTS.byline),
        text('authors', 'Authors', OUTRO_DEFAULTS.authors),
        text('credit', 'Credit', OUTRO_DEFAULTS.credit),
        text('url', 'URL', OUTRO_DEFAULTS.url),
      ],
    },
  ],
  transitions: [],
  captions: [
    {
      id: 'title',
      label: 'Opening question',
      ...TITLE,
      component: OpenTitle,
      props: { duration: TITLE.duration, line1: OPEN_TITLE_DEFAULTS.line1, line2: OPEN_TITLE_DEFAULTS.line2, size: OPEN_TITLE_DEFAULTS.size },
      schema: [
        text('line1', 'Line 1', OPEN_TITLE_DEFAULTS.line1),
        text('line2', 'Line 2', OPEN_TITLE_DEFAULTS.line2),
        size('size', 'Size', OPEN_TITLE_DEFAULTS.size, 60, 140),
      ],
      durationProp: 'duration',
    },
    ...CAPTIONS.map((c, i) => ({
      id: `caption${i + 1}`,
      label: `${c.chip}: ${c.text}`,
      from: c.from,
      duration: c.duration,
      component: CaptionBar,
      props: { chip: c.chip, text: c.text, duration: c.duration, size: CAPTION_DEFAULTS.size },
      schema: [text('chip', 'Page chip', c.chip), text('text', 'Caption', c.text), size('size', 'Size', CAPTION_DEFAULTS.size, 40, 80)],
      durationProp: 'duration',
      cardId: 'caption',
      cardName: 'Caption',
    })),
  ],
  overlays: [],
  sfx: SFX.map((c) => ({ from: c.from, duration: sfxDuration(c), src: `audio/${c.src}`, volume: c.volume })),
  bgm: [{ from: 0, duration: TOTAL, src: BGM.src, volume: BGM.volume }],
  order: ['transitions', 'captions', 'overlays'],
  original: Main,
};
