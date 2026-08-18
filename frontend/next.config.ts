import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  async rewrites() {
    // In production Caddy proxies /api/admin/* and /api/diagrams/* to the
    // backend directly, so this never runs. It exists so the Next.js server
    // can reach a backend on its own (CI, local dev without Caddy).
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      { source: "/api/admin/:path*", destination: `${backendUrl}/api/admin/:path*` },
      { source: "/api/diagrams/:path*", destination: `${backendUrl}/api/diagrams/:path*` },
    ];
  },
};

export default nextConfig;
