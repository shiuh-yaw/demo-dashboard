/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack: (config: any) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  async redirects() {
    // Back-compat for embedded customer apps still pointing at the
    // legacy `/w/:id/...` URLs. Rewrites them to the unified
    // `?theme=:id` contract; query params (e.g. `?externalId=...`)
    // are preserved by Next.js automatically.
    return [
      {
        source: "/w/:id",
        destination: "/?theme=:id",
        permanent: false,
      },
      {
        source: "/w/:id/:path*",
        destination: "/:path*?theme=:id",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
