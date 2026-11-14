import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense, type ReactNode } from "react";

import { BRAND, TAGLINE } from "@/shared/brand";

import "./tokens.css";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "./shell";

// Vendored, unmodified IBM Plex (see ./fonts/README.md). tokens.css maps these variables
// onto --font-sans and --font-mono.
const plexSans = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND} — ${TAGLINE}`,
  description:
    "Sun and Earth geometry, terrain-aware sunlight and Earth line of sight for cited lunar south-pole sites, with the evidence behind every number.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
