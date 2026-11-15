import { AbsoluteFill, Sequence } from 'remotion';
import { Fonts } from './lib/Fonts';
import { CaptionBar } from './scenes/CaptionBar';
import { OpenTitle } from './scenes/OpenTitle';
import { SceneCompare } from './scenes/SceneCompare';
import { SceneData } from './scenes/SceneData';
import { SceneIllum } from './scenes/SceneIllum';
import { SceneOutro } from './scenes/SceneOutro';
import { SceneOverview } from './scenes/SceneOverview';
import { SceneTerrain } from './scenes/SceneTerrain';
import { Soundtrack } from './Soundtrack';
import { C } from './theme';
import { CAPTIONS, SHOTS, TITLE } from './timeline';

export const Main: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Fonts />
    <Sequence from={SHOTS.overview.from} durationInFrames={SHOTS.overview.duration}>
      <SceneOverview duration={SHOTS.overview.duration} />
    </Sequence>
    <Sequence from={SHOTS.illum.from} durationInFrames={SHOTS.illum.duration}>
      <SceneIllum duration={SHOTS.illum.duration} />
    </Sequence>
    <Sequence from={SHOTS.terrain.from} durationInFrames={SHOTS.terrain.duration}>
      <SceneTerrain duration={SHOTS.terrain.duration} />
    </Sequence>
    <Sequence from={SHOTS.compare.from} durationInFrames={SHOTS.compare.duration}>
      <SceneCompare duration={SHOTS.compare.duration} />
    </Sequence>
    <Sequence from={SHOTS.data.from} durationInFrames={SHOTS.data.duration}>
      <SceneData duration={SHOTS.data.duration} />
    </Sequence>
    <Sequence from={SHOTS.outro.from} durationInFrames={SHOTS.outro.duration}>
      <SceneOutro />
    </Sequence>

    <Sequence from={TITLE.from} durationInFrames={TITLE.duration}>
      <OpenTitle duration={TITLE.duration} />
    </Sequence>
    {CAPTIONS.map((c) => (
      <Sequence key={c.from} from={c.from} durationInFrames={c.duration}>
        <CaptionBar chip={c.chip} text={c.text} duration={c.duration} />
      </Sequence>
    ))}

    <Soundtrack bgm={bgm} />
  </AbsoluteFill>
);
