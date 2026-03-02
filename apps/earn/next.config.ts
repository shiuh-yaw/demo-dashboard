import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { isServer }) => {
    // Handle pino-pretty not being available in production
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "pino-pretty": false,
      };
    }
    return config;
  },
};

export default nextConfig;
