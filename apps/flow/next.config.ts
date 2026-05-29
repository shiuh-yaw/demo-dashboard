import type { NextConfig } from "next";

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
