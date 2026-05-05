import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Avoid loading the app's Tailwind v4 postcss config.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts", "__tests__/**/*.test.ts"],
  },
});
