import type { NextConfig } from "next";

// Touch to trigger a fresh Vercel preview build for the wallet app.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The delegated-access packages ship a native MPC addon
  // (libmpc_executor_*.node). Bundlers can't resolve a .node binary, so they
  // must stay runtime requires - otherwise the webhook route fails to load.
  serverExternalPackages: [
    "@dynamic-labs-wallet/node",
    "@dynamic-labs-wallet/node-evm",
    "@dynamic-labs-wallet/node-svm",
  ],
};

export default nextConfig;
