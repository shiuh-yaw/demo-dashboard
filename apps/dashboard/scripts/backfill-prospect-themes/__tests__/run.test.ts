/**
 * backfill-prospect-themes orchestrator - injected count/copy fns assert
 * dry-run performs no copy and a live run copies + reports.
 */

import { describe, expect, it, vi } from "vitest";

import { runProspectThemesBackfill } from "../run";

describe("runProspectThemesBackfill", () => {
  it("dry-run counts but never copies", async () => {
    const countMissing = vi.fn(async () => 3);
    const copyMissing = vi.fn(async () => 3);
    const report = await runProspectThemesBackfill({
      countMissing,
      copyMissing,
      dryRun: true,
    });
    expect(report).toEqual({ missing: 3, copied: 0, dryRun: true });
    expect(copyMissing).not.toHaveBeenCalled();
  });

  it("live run copies the missing rows and reports the count", async () => {
    const report = await runProspectThemesBackfill({
      countMissing: async () => 2,
      copyMissing: async () => 2,
    });
    expect(report).toEqual({ missing: 2, copied: 2, dryRun: false });
  });

  it("copies nothing when no rows are missing (idempotent re-run)", async () => {
    const copyMissing = vi.fn(async () => 0);
    const report = await runProspectThemesBackfill({
      countMissing: async () => 0,
      copyMissing,
    });
    expect(report.copied).toBe(0);
    expect(copyMissing).toHaveBeenCalledOnce();
  });
});
