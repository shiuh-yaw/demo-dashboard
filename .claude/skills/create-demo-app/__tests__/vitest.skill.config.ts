/**
 * Dedicated vitest config for the create-demo-app skill tests.
 *
 * Why a separate config: these tests spawn real Claude Code subprocesses
 * (cost API tokens, take 30s-15min) and are NOT part of the dashboard's
 * default `pnpm test` run. Keeping them on their own config means
 * `pnpm turbo test` / `pnpm test` never touches them.
 *
 * Invoked via the root `test:skill` / `test:skill:success` scripts.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: [path.resolve(__dirname, "**/*.test.ts")],
    // No setup file — the skill tests don't import dashboard code, so they
    // don't need the env-var setup that dashboard tests use.
  },
  // Vite, even with no CSS imports, walks up the tree looking for a
  // postcss.config — the dashboard ships a Tailwind v4 PostCSS pipeline
  // which fails to load under a Node-only invocation. Disable PostCSS
  // entirely; these tests never import CSS.
  css: {
    postcss: { plugins: [] },
  },
});
