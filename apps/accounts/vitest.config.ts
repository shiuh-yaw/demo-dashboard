import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  // Mirror `tsconfig.json`'s `@/*` alias. Without it, a test importing a pure
  // helper fails to load as soon as anything else in that module reaches for
  // `@/…` - the helper is testable, its neighbours' imports are not.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "**/__tests__/**/*.test.ts"],
    // Stub the env vars validated by `@t3-oss/env-nextjs` (`./lib/env.ts`)
    // and the workspace `resolveCredentials()` chain (D-003) so module-load
    // does not throw under `vitest run` outside Vercel.
    env: {
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
        process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "test-env-id",
    },
  },
});
