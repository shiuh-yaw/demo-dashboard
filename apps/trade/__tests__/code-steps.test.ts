import { describe, expect, it } from "vitest";
import {
  TRADE_OTP_STEPS,
  TRADE_SDK_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";

const ALL_STEPS = [...TRADE_SDK_STEPS, ...TRADE_OTP_STEPS];

describe("trade code-step content", () => {
  it("every step carries non-empty content", () => {
    expect(TRADE_SDK_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(TRADE_OTP_STEPS.length).toBeGreaterThanOrEqual(2);
    // Every TS snippet ships its import line.
    for (const step of ALL_STEPS) {
      if (step.lang === "typescript") {
        expect(step.code, `${step.title} is missing its import`).toMatch(
          /^import /,
        );
      }
      expect(step.num).toMatch(/^\d\d$/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.prose.length).toBeGreaterThan(0);
      expect(step.filename.length).toBeGreaterThan(0);
      expect(step.code.trim().length).toBeGreaterThan(0);
    }
  });

  it("docs URLs point at dynamic.xyz docs", () => {
    for (const step of ALL_STEPS) {
      expect(step.docsUrl).toMatch(/^https:\/\/(www\.)?dynamic\.xyz\/docs\//);
    }
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(TRADE_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(TRADE_SDK_STEPS[0]!.code);
  });
});
