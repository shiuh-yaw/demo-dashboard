import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The scenario page's integration panel quotes the native host harnesses off
  // disk, and that route is dynamic (it reads request headers for theming), so
  // the reads happen per-request and the files must be traced into the bundle.
  outputFileTracingIncludes: {
    "/": ["./native/**/*.swift", "./native/**/*.kt", "./native/**/*.ts"],
  },
  eslint: {
    // native/ holds the iOS / Android / React Native host harnesses verbatim
    // from upstream. They are reference material for integrators, not part of
    // this app's build graph.
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;
