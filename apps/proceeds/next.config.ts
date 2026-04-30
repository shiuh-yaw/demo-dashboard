import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "publickey-credentials-create=*, publickey-credentials-get=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
