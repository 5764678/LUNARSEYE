import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, HEIGHT, TOTAL, WIDTH } from './timeline';

export const Root: React.FC = () => (
  <Composition id="LunarseyePromo" component={Main} durationInFrames={TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ bgm: true }} />
);
