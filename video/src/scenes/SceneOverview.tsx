// S1 + S2: the opening and the Overview page are one continuous take over the live page.
// The film opens inside the globe canvas and pulls back until the whole Overview page is in
// frame, while the product's own playback runs (5 d/s over the 90-day window).
import { Cam, CamKey } from '../lib/Cam';
import { Handoff } from '../lib/Handoff';
import { pad4 } from '../lib/motion';
import { CUT } from '../timeline';
import { useCurrentFrame } from 'remotion';

export const OVERVIEW_FRAMES = 320; // captured frames of public/seq/ov
// The film starts this far into the capture: here the Sun rises across the opening frame.
export const OVERVIEW_OFFSET = 93;

const KEYS: CamKey[] = [
  { frame: 0, cx: 1080, cy: 470, zoom: 2.5 }, // inside the canvas: the Moon, the terminator, the sites
  { frame: CUT.pullBack - 12, cx: 1072, cy: 468, zoom: 2.42 },
  { frame: CUT.pullBack + 30, cx: 960, cy: 540, zoom: 1 }, // the whole page
  { frame: CUT.pullBack + 54, cx: 960, cy: 540, zoom: 1 },
  { frame: CUT.pullBack + 78, cx: 1100, cy: 731, zoom: 1.55 }, // the timeline lanes under the globe
  { frame: CUT.illum + 6, cx: 1100, cy: 731, zoom: 1.55 },
];

export const SceneOverview: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const shot = Math.min(frame + OVERVIEW_OFFSET, OVERVIEW_FRAMES - 1);
  return (
    <Handoff frame={frame} duration={duration} enter={false}>
      <Cam src={`seq/ov/f${pad4(shot)}.png`} pageH={1080} keys={KEYS} />
    </Handoff>
  );
};
