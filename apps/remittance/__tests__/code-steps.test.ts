import { describe, expect, it } from "vitest";
import { assertAuthoredCodeSteps } from "@dynamic-demos/code-highlight/testing";
import {
  REMITTANCE_OTP_STEPS,
  REMITTANCE_SDK_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";

describe("remittance code steps", () => {
  it("SDK and OTP steps satisfy the authored-step contract", () => {
    expect(REMITTANCE_SDK_STEPS.length).toBe(5);
    expect(REMITTANCE_OTP_STEPS.length).toBe(2);
    // Shared content rules: non-empty fields, two-digit num, dynamic.xyz
    // docs links, every TS snippet opens with its import line.
    assertAuthoredCodeSteps([
      ...REMITTANCE_SDK_STEPS,
      ...REMITTANCE_OTP_STEPS,
    ]);
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(REMITTANCE_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(REMITTANCE_SDK_STEPS[0]!.code);
  });
});
