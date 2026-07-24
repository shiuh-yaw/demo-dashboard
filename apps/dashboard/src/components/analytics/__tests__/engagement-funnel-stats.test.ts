import { describe, expect, it } from "vitest";
import {
  computeFunnelRows,
  hasFunnelData,
} from "../engagement-funnel-stats";
import type { FunnelStage } from "@/lib/services/types";

const stages: FunnelStage[] = [
  { key: "viewed", label: "Viewed", count: 100 },
  { key: "interacted", label: "Interacted", count: 40 },
  { key: "authenticated", label: "Authenticated", count: 10 },
];

describe("hasFunnelData", () => {
  it("is false for no stages", () => {
    expect(hasFunnelData([])).toBe(false);
  });

  it("is false when the base stage has zero count", () => {
    expect(
      hasFunnelData([
        { key: "viewed", label: "Viewed", count: 0 },
        { key: "interacted", label: "Interacted", count: 0 },
      ]),
    ).toBe(false);
  });

  it("is true when the base stage has activity", () => {
    expect(hasFunnelData(stages)).toBe(true);
  });
});

describe("computeFunnelRows", () => {
  it("scales widths + conversion to the base stage (base is 100%)", () => {
    const rows = computeFunnelRows(stages);
    expect(rows.map((r) => r.widthPct)).toEqual([100, 40, 10]);
    expect(rows.map((r) => r.conversionPct)).toEqual([100, 40, 10]);
  });

  it("renders whatever stages come back, never assuming a count", () => {
    const withCompleted: FunnelStage[] = [
      ...stages,
      { key: "completed", label: "Completed", count: 5 },
    ];
    const rows = computeFunnelRows(withCompleted);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({ key: "completed", widthPct: 5 });
  });

  it("clamps a stage that exceeds the base so a bar never overflows", () => {
    const rows = computeFunnelRows([
      { key: "viewed", label: "Viewed", count: 10 },
      { key: "interacted", label: "Interacted", count: 15 },
    ]);
    expect(rows[1]!.widthPct).toBe(100);
  });

  it("yields all-zero widths for a zero base rather than dividing by zero", () => {
    const rows = computeFunnelRows([
      { key: "viewed", label: "Viewed", count: 0 },
      { key: "interacted", label: "Interacted", count: 0 },
    ]);
    expect(rows.every((r) => r.widthPct === 0)).toBe(true);
  });

  it("preserves a single meaningful stage cleanly", () => {
    const rows = computeFunnelRows([{ key: "viewed", label: "Viewed", count: 7 }]);
    expect(rows).toEqual([
      { key: "viewed", label: "Viewed", count: 7, widthPct: 100, conversionPct: 100 },
    ]);
  });
});
