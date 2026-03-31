import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
