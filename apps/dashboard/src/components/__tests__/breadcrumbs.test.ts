import { describe, expect, it } from "vitest";

import { buildTrail } from "@/components/breadcrumbs";

describe("buildTrail - prospect hub", () => {
  it("names the prospect at the hub root", () => {
    expect(buildTrail("/dashboard/prospects/p1", "Acme")).toEqual([
      { label: "Prospects", href: "/dashboard" },
      { label: "Acme" },
    ]);
  });

  it("keeps the demos grid as a three-crumb trail", () => {
    expect(buildTrail("/dashboard/prospects/p1/demos", "Acme")).toEqual([
      { label: "Prospects", href: "/dashboard" },
      { label: "Acme", href: "/dashboard/prospects/p1" },
      { label: "Demos" },
    ]);
  });

  it("adds the demo leaf for an in-context instance route", () => {
    expect(
      buildTrail("/dashboard/prospects/p1/demos/c1", "Acme", "Wallet Demo"),
    ).toEqual([
      { label: "Prospects", href: "/dashboard" },
      { label: "Acme", href: "/dashboard/prospects/p1" },
      { label: "Demos", href: "/dashboard/prospects/p1/demos" },
      { label: "Wallet Demo" },
    ]);
  });

  it("falls back to a generic leaf before the demo name resolves", () => {
    const trail = buildTrail("/dashboard/prospects/p1/demos/c1", "Acme", null);
    expect(trail[trail.length - 1]).toEqual({ label: "Demo" });
  });
});
