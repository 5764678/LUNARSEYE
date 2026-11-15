// Focus handoff between two pages (shot-transitions, style C): the outgoing page slides out of
// focus while the incoming one pulls focus, two frames later, drifting the other way.
import { AbsoluteFill } from 'remotion';
import { HAND } from '../timeline';
import { tw } from './motion';

export const Handoff: React.FC<{
  frame: number; // local frame of the shot
  duration: number; // full shot length, overlaps included
  enter?: boolean;
  exit?: boolean;
  children: React.ReactNode;
}> = ({ frame, duration, enter = true, exit = true, children }) => {
  // cut-in sits at local HAND, cut-out at duration - HAND
  const inP = enter ? tw(frame, [HAND - 4, HAND + 6], [0, 1], [0.3, 0, 0.2, 1]) : 1;
  const outP = exit ? tw(frame, [duration - HAND - 6, duration - HAND + 4], [0, 1], [0.45, 0, 0.3, 1]) : 0;
  const blur = (1 - inP) * 8 + outP * 8;
  const drift = (1 - inP) * 50 - outP * 60;
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        transform: drift ? `translateX(${drift}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
