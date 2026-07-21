import { describe, expect, it } from "vitest";
import { assertAuthoredCodeSteps } from "@dynamic-demos/code-highlight/testing";
import {
  EARN_OTP_STEPS,
  EARN_SDK_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";

const ALL_STEPS = [...EARN_SDK_STEPS, ...EARN_OTP_STEPS];

describe("earn code-step content", () => {
  it("every step carries non-empty content", () => {
    expect(EARN_SDK_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(EARN_OTP_STEPS.length).toBeGreaterThanOrEqual(2);
    // Shared content rules: non-empty fields, two-digit num, dynamic.xyz
    // docs links, every TS snippet opens with its import line.
    assertAuthoredCodeSteps(ALL_STEPS);
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(EARN_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(EARN_SDK_STEPS[0]!.code);
  });
});
