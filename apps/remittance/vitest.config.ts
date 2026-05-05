import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  test: {
    globals: false,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "**/__tests__/**/*.test.ts"],
  },
});
