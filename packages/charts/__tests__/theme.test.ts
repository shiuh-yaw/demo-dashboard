import { describe, expect, it } from "vitest";
import { chartColorForOrdinal, chartColorVar } from "../src/theme";

describe("chart theme colors", () => {
  it("resolves each index to the matching CSS variable, never a hex literal", () => {
    for (let i = 1; i <= 5; i += 1) {
      const value = chartColorVar(i as 1 | 2 | 3 | 4 | 5);
      expect(value).toBe(`var(--chart-${i})`);
      expect(value).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });

  it("cycles ordinals through the five chart variables", () => {
    expect(chartColorForOrdinal(0)).toBe("var(--chart-1)");
    expect(chartColorForOrdinal(4)).toBe("var(--chart-5)");
    expect(chartColorForOrdinal(5)).toBe("var(--chart-1)");
    expect(chartColorForOrdinal(7)).toBe("var(--chart-3)");
  });
});
