import { describe, expect, it } from "vitest";
import { assertAuthoredCodeSteps } from "@dynamic-demos/code-highlight/testing";
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
    // Shared content rules: non-empty fields, two-digit num, dynamic.xyz
    // docs links, every TS snippet opens with its import line.
    assertAuthoredCodeSteps(ALL_STEPS);
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(TRADE_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(TRADE_SDK_STEPS[0]!.code);
  });
});
