import { describe, expect, it } from "vitest";
import {
  formatChartDate,
  formatCount,
  formatDuration,
  formatLastViewed,
  hasEngagementData,
} from "../prospect-overview-stats";

describe("formatCount", () => {
  it("renders zero as a dash, not 0", () => {
    expect(formatCount(0)).toBe("-");
  });

  it("renders a positive count as-is", () => {
    expect(formatCount(42)).toBe("42");
  });
});

describe("formatLastViewed", () => {
  it("renders null as a dash", () => {
    expect(formatLastViewed(null)).toBe("-");
  });

  it("renders an invalid ISO string as a dash", () => {
    expect(formatLastViewed("not-a-date")).toBe("-");
  });

  it("renders a valid ISO string as a short date", () => {
    expect(formatLastViewed("2026-07-04T12:00:00.000Z")).toMatch(/Jul/);
  });
});

describe("formatDuration", () => {
  it("renders zero as a dash, not 0s", () => {
    expect(formatDuration(0)).toBe("-");
  });

  it("renders sub-minute durations as seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("renders minute-plus durations as minutes and seconds", () => {
    expect(formatDuration(203)).toBe("3m 23s");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(23.4)).toBe("23s");
  });
});

describe("formatChartDate", () => {
  it("formats a UTC-day bucket in UTC, not local time", () => {
    expect(formatChartDate(new Date("2026-07-04T00:00:00Z"))).toMatch(/Jul/);
  });

  it("passes through an unparseable value unchanged", () => {
    expect(formatChartDate("not-a-date")).toBe("not-a-date");
  });
});

describe("hasEngagementData", () => {
  it("is false with zero sessions - drives the getting-started panel", () => {
    expect(hasEngagementData(0)).toBe(false);
  });

  it("is true with at least one session - drives the full dashboard", () => {
    expect(hasEngagementData(3)).toBe(true);
  });
});
