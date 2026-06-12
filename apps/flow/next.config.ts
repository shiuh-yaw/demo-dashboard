import type { NextConfig } from "next";

// Touch to trigger a fresh Vercel preview build for the flow app.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@dynamic-demos/dynamic",
    "@dynamic-demos/theme",
    "@dynamic-demos/types",
    "@dynamic-demos/ui",
    "@dynamic-demos/utils",
  ],
};

export default nextConfig;
