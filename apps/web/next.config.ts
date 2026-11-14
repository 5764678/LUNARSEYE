import path from "node:path";

import type { NextConfig } from "next";

// The browser only talks to this origin: `/api/*` is proxied to FastAPI at request time by
// `src/app/api/[...path]/route.ts`, which reads LUNARIS_API_URL when the server runs (a
// build-time rewrite would freeze the URL into the image).
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Docker image sets NEXT_OUTPUT=standalone for a small runtime bundle. The tracing
  // root is the monorepo root so the hoisted node_modules are found.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
};

export default nextConfig;
