import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Populate env vars before any test module loads so that importing
    // `@/env` (transitively pulled in via `@/lib/redis`) doesn't fail
    // validation. Dummies only — tests never open real connections.
    setupFiles: ["./src/lib/services/__tests__/setup.ts"],
  },
  // The dashboard ships a PostCSS pipeline (Tailwind v4) that Vite tries
  // to load by default and fails on under Node-only tests. We don't import
  // any CSS in tests, so disable the PostCSS resolver entirely.
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
