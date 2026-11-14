import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: "LUNARIS — lunar south-pole site analysis",
  description:
    "Sun and Earth geometry, terrain-aware sunlight and Earth line of sight for cited lunar south-pole sites, with the evidence behind every number.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
