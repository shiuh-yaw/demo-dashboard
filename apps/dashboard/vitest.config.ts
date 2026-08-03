import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Match Next's automatic JSX runtime so .tsx component tests need no React import.
  esbuild: { jsx: "automatic" },
  test: {
    globals: false,
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
    // The create-demo-app skill tests live outside the dashboard tree and
    // are run via a dedicated config file
    // (.claude/skills/create-demo-app/__tests__/vitest.skill.config.ts) so
    // they do NOT get picked up by the dashboard's default `pnpm test` /
    // `pnpm turbo test` run (those tests spawn real Claude Code subprocesses
    // and cost API tokens). Invoke explicitly via root scripts:
    //   pnpm test:skill            # 5 failure-mode tests
    //   pnpm test:skill:success    # main-only success path
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
