import { describe, expect, it } from "vitest";
import { EXCHANGE_SDK_STEPS } from "../lib/code-steps";

describe("code steps", () => {
  it("every TypeScript snippet opens with its import line", () => {
    for (const step of EXCHANGE_SDK_STEPS) {
      if (step.lang !== "typescript") continue;
      expect(step.code.trimStart().startsWith("import "), step.title).toBe(true);
    }
  });

  it("numbers are unique and docs links are https", () => {
    const nums = EXCHANGE_SDK_STEPS.map((s) => s.num);
    expect(new Set(nums).size).toBe(nums.length);
    for (const s of EXCHANGE_SDK_STEPS) expect(new URL(s.docsUrl).protocol).toBe("https:");
  });
});
