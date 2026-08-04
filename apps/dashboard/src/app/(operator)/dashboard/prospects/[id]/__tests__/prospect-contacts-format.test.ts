import { describe, expect, it } from "vitest";
import {
  companyLabel,
  formatDateTime,
  formatDuration,
  formatShortDate,
  milestoneLabel,
} from "../prospect-contacts-format";
import type { ContactView, VisitorSessionView } from "@/lib/services";

describe("formatShortDate", () => {
  it("renders an invalid ISO string as a dash", () => {
    expect(formatShortDate("not-a-date")).toBe("-");
  });

  it("renders a valid ISO string as a short date", () => {
    expect(formatShortDate("2026-07-04T12:00:00.000Z")).toMatch(/Jul/);
  });
});

describe("formatDateTime", () => {
  it("renders an invalid ISO string as a dash", () => {
    expect(formatDateTime("not-a-date")).toBe("-");
  });

  it("renders a valid ISO string with time", () => {
    expect(formatDateTime("2026-07-04T12:00:00.000Z")).toMatch(/Jul/);
  });
});

describe("formatDuration", () => {
  it("renders sub-minute durations as seconds only", () => {
    expect(
      formatDuration("2026-07-04T12:00:00.000Z", "2026-07-04T12:00:45.000Z"),
    ).toBe("45s");
  });

  it("renders minute-plus durations as minutes and seconds", () => {
    expect(
      formatDuration("2026-07-04T12:00:00.000Z", "2026-07-04T12:03:23.000Z"),
    ).toBe("3m 23s");
  });

  it("omits seconds when the remainder is exactly zero", () => {
    expect(
      formatDuration("2026-07-04T12:00:00.000Z", "2026-07-04T12:05:00.000Z"),
    ).toBe("5m");
  });

  it("clamps a negative span (last seen before started) to zero", () => {
    expect(
      formatDuration("2026-07-04T12:00:10.000Z", "2026-07-04T12:00:00.000Z"),
    ).toBe("0s");
  });
});

describe("milestoneLabel", () => {
  function session(milestones: string[]): VisitorSessionView {
    return {
      id: "s1",
      demoConfigId: null,
      demoSlug: "demo",
      anonId: "a1",
      startedAt: "2026-07-04T12:00:00.000Z",
      lastSeenAt: "2026-07-04T12:05:00.000Z",
      company: null,
      email: null,
      dynamicUserId: null,
      milestones,
      identifiedUserId: null,
      identifiedEmail: null,
    };
  }

  it("falls back to Viewed for pageview-only sessions", () => {
    expect(milestoneLabel(session([]))).toBe("Viewed");
  });

  it("title-cases the last milestone, splitting on hyphens and underscores", () => {
    expect(milestoneLabel(session(["viewed", "wallet_connected"]))).toBe(
      "Wallet Connected",
    );
  });
});

describe("companyLabel", () => {
  function contact(company: ContactView["company"]): ContactView {
    return {
      key: "c1",
      email: null,
      company,
      firstSeenAt: "2026-07-04T12:00:00.000Z",
      lastSeenAt: "2026-07-04T12:00:00.000Z",
      sessionCount: 0,
      demoSlugs: [],
    };
  }

  it("prefers the company name over the domain", () => {
    expect(
      companyLabel(contact({ name: "Acme Inc", domain: "acme.com" })),
    ).toBe("Acme Inc");
  });

  it("falls back to the domain when no name is captured", () => {
    expect(companyLabel(contact({ name: null, domain: "acme.com" }))).toBe(
      "acme.com",
    );
  });

  it("falls back to Unknown company when neither is captured", () => {
    expect(companyLabel(contact(null))).toBe("Unknown company");
  });
});
