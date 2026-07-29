/**
 * Unit tests for the Prospect → synthesized config payload fallback.
 * Pure function — no service deps.
 */

import { describe, expect, it } from "vitest";

import type { Prospect } from "@/lib/services/types";

import { synthesizeProspectConfig } from "../prospect-fallback";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "bf_test",
    ownerId: "o1",
    teamId: null,
    createdById: null,
    status: "ACTIVE",
    name: "SpaceX",
    description: null,
    companyUrl: null,
    logo: "custom",
    logoUrl: "https://cdn.example.com/spacex.png",
    borderRadius: null,
    primaryColor: "#0b1d3a",
    primaryHoverColor: "#12294f",
    secondaryColor: null,
    accentColor: "#3aa8ff",
    pageBackground: "#f7f9fc",
    background: null,
    foreground: "#0e121b",
    mutedTextColor: null,
    borderColor: null,
    rowBackground: null,
    rowHoverBackground: null,
    gradientFrom: null,
    gradientTo: null,
    domain: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("synthesizeProspectConfig", () => {
  it("projects the full prospect palette onto the theme", () => {
    const { theme } = synthesizeProspectConfig("trade", makeProspect());
    expect(theme.primaryColor).toBe("#0b1d3a");
    expect(theme.primaryHoverColor).toBe("#12294f");
    expect(theme.accentColor).toBe("#3aa8ff");
    expect(theme.pageBackground).toBe("#f7f9fc");
    // null prospect fields are absent, not null - fetchDemoConfig's
    // shallow merge must not clobber app defaults with nulls.
    expect("borderColor" in theme).toBe(false);
  });

  it("uses foregroundColor + branding.logoUrl/appName for trade-family kinds", () => {
    const { theme, branding } = synthesizeProspectConfig(
      "trade",
      makeProspect(),
    );
    expect(theme.foregroundColor).toBe("#0e121b");
    expect(branding).toEqual({
      logoUrl: "https://cdn.example.com/spacex.png",
      appName: "SpaceX",
    });
  });

  it("uses foreground + branding.logo/name for wallet-family kinds", () => {
    const { theme, branding } = synthesizeProspectConfig(
      "wallet",
      makeProspect(),
    );
    expect(theme.foreground).toBe("#0e121b");
    expect(branding).toEqual({
      logo: "https://cdn.example.com/spacex.png",
      name: "SpaceX",
    });
  });

  it("uses foregroundColor + branding.name/logoUrl for card", () => {
    const { theme, branding } = synthesizeProspectConfig(
      "card",
      makeProspect(),
    );
    expect(theme.foregroundColor).toBe("#0e121b");
    expect(branding).toEqual({
      logoUrl: "https://cdn.example.com/spacex.png",
      name: "SpaceX",
    });
  });

  it("omits the logo when the prospect has none", () => {
    const { branding } = synthesizeProspectConfig(
      "earn",
      makeProspect({ logo: "dynamic", logoUrl: null }),
    );
    expect("logoUrl" in branding).toBe(false);
    expect(branding.appName).toBe("SpaceX");
  });
});
