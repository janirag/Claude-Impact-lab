import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The prototype (copied into public/ by scripts/copy-prototype.mjs) is the frontend for now.
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/prototype.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
