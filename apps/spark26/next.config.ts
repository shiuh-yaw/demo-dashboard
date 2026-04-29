import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // tsconfig uses moduleResolution: "bundler" and our codebase uses NodeNext
  // style ".js" specifiers that tsc resolves to ".ts"/".tsx". Next's webpack
  // does not do this by default — extensionAlias teaches it to try ".ts"/".tsx"
  // when the import specifier ends in ".js".
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
