import type { NextConfig } from "next";

// The browser talks to the API through this same origin (/api/* → FastAPI), so one
// port serves the whole demo and no CORS configuration is needed.
const apiUrl = process.env.LUNARIS_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
