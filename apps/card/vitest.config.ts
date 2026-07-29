import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  resolve: {
    // Real (non-mocked) "@/..." imports need this - e.g. the apply route
    // importing its own zod schema. Mirrors tsconfig's "@/*": ["./*"].
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts", "**/__tests__/**/*.test.ts"],
    // rusdc-balance.test.ts mocks viem via `await importActual`, which loads
    // the (large) viem module; under parallel `turbo test` load that module
    // resolution can exceed vitest's 5s default and time out. 20s gives ample
    // headroom (the test itself runs in ~1s once viem is loaded).
    testTimeout: 20000,
    // Stub the env vars validated by `@t3-oss/env-nextjs` (`./lib/env.ts`)
    // and the workspace `resolveCredentials()` chain (D-003) so module-load
    // does not throw under `vitest run` outside Vercel.
    env: {
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
        process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "test-env-id",
    },
  },
});
