// S4: Terrain. The product's own 3D south-pole scene, orbited by a real drag while the SPICE Sun
// circles; then the camera settles on the slope and roughness table for the selected site.
import { useCurrentFrame } from 'remotion';
import { Cam, CamKey } from '../lib/Cam';
import { Handoff } from '../lib/Handoff';
import { pad4 } from '../lib/motion';
import { SHOTS, TER } from '../timeline';

export const TERRAIN_FRAMES = 125;

const KEYS: CamKey[] = [
  { frame: 0, cx: 1104, cy: 502, zoom: 1.18 }, // the scene, edge to edge, from just under the top bar
  { frame: TER.toTable - SHOTS.terrain.from, cx: 1104, cy: 496, zoom: 1.21 },
  { frame: TER.toTable - SHOTS.terrain.from + 20, cx: 850, cy: 772, zoom: 1.75 }, // "Terrain at Connecting ridge": slope, roughness
  { frame: 125, cx: 850, cy: 772, zoom: 1.75 },
];

export const SceneTerrain: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const shot = Math.min(Math.max(frame, 1), TERRAIN_FRAMES - 1); // capture frame 0 predates the first WebGL paint
  return (
    <Handoff frame={frame} duration={duration}>
      <Cam src={`seq/tr/f${pad4(shot)}.png`} pageH={1080} keys={KEYS} />
    </Handoff>
  );
};
