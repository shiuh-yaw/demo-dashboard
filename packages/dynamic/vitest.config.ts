import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    // og-image.test.ts renders every OG motif once in a beforeAll. That is
    // seconds of blocking CPU per render and CI runners are several times
    // slower than a laptop, so the default 10s hook budget is not enough -
    // note this is a separate knob from testTimeout above.
    hookTimeout: 60000,
  },
});
