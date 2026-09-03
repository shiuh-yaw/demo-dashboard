import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  test: {
    globals: false,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "**/__tests__/**/*.test.ts"],
    // Staged mode needs no Dynamic environment; live-mode modules read the
    // id lazily, so a stub keeps `lib/env.ts` from throwing under vitest.
    env: {
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
        process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "test-env-id",
    },
  },
});
