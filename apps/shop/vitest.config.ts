import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  test: {
    globals: false,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "**/__tests__/**/*.test.ts"],
    // Stub env vars validated by `@t3-oss/env-nextjs` (`./lib/env.ts`) and the
    // workspace `resolveCredentials()` chain (D-003) so module-load does not
    // throw under `vitest run` outside Vercel.
    env: {
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
        process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "test-env-id",
      DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY ?? "test-dynamic-api-key",
      SETTLEMENT_EVM_ADDRESS:
        process.env.SETTLEMENT_EVM_ADDRESS ??
        "0x0000000000000000000000000000000000000000",
      SETTLEMENT_SOL_ADDRESS:
        process.env.SETTLEMENT_SOL_ADDRESS ?? "11111111111111111111111111111111",
    },
  },
});
