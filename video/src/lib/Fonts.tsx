import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const FACES = [
  ['IBM Plex Sans', 400, 'IBMPlexSans-Regular.woff2'],
  ['IBM Plex Sans', 500, 'IBMPlexSans-Medium.woff2'],
  ['IBM Plex Sans', 600, 'IBMPlexSans-SemiBold.woff2'],
  ['IBM Plex Mono', 400, 'IBMPlexMono-Regular.woff2'],
  ['IBM Plex Mono', 600, 'IBMPlexMono-SemiBold.woff2'],
] as const;

/** The product's own typefaces (apps/web/src/app/fonts), loaded before any frame is drawn. */
export const Fonts: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      FACES.map(([family, weight, file]) => {
        const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight: String(weight) });
        document.fonts.add(face);
        return face.load();
      }),
    ).then(
      () => continueRender(handle),
      () => continueRender(handle),
    );
  }, [handle]);
  return null;
};
