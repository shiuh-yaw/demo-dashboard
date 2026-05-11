import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Back-compat: legacy `/e/<id>/...` deep-links collapse onto the flat
  // route shape, where `?theme=<configId>` is the canonical config selector.
  // The cookie is set by middleware on first hit; subsequent navigations
  // drop the query param.
  async redirects() {
    return [
      {
        source: "/e/:id",
        destination: "/?theme=:id",
        permanent: false,
      },
      {
        source: "/e/:id/:rest*",
        destination: "/?theme=:id",
        permanent: false,
      },
    ];
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
