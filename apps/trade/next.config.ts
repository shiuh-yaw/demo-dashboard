import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Back-compat redirect: legacy `/t/[id]/<rest>` deep links → flat
  // `/<rest>?theme=[id]`. The canonical URL contract is cookie + `?theme=`.
  async redirects() {
    return [
      {
        source: "/t/:id",
        destination: "/?theme=:id",
        permanent: false,
      },
      {
        source: "/t/:id/:rest*",
        destination: "/:rest*?theme=:id",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.alchemyapi.io",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.morpho.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "polymarket.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
