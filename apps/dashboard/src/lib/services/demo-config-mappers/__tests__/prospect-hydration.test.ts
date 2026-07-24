/**
 * Unit tests for prospect-hydration helpers.
 *
 * These are pure functions — no Redis / service deps.
 */

import { describe, expect, it } from "vitest";

import type { Prospect } from "@/lib/services/types";

import { hydrateProspectTheme, prospectLogoUrl } from "../prospect-hydration";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "bf_test",
    ownerId: "o1",
    teamId: null,
    createdById: null,
    status: "ACTIVE",
    name: "Test Prospect",
    description: null,
    companyUrl: null,
    logo: "dynamic",
    logoUrl: null,
    borderRadius: null,
    primaryColor: "#111111",
    primaryHoverColor: "#222222",
    secondaryColor: null,
    accentColor: "#333333",
    pageBackground: null,
    background: null,
    foreground: null,
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

describe("hydrateProspectTheme", () => {
  it("returns configTheme when prospect is null (legacy path)", () => {
    const configTheme = { primaryColor: "#aaa" };
    const result = hydrateProspectTheme(null, configTheme, null);
    expect(result).toBe(configTheme);
  });

  it("returns undefined when prospect is null and configTheme is undefined", () => {
    expect(hydrateProspectTheme(null, undefined, null)).toBeUndefined();
  });

  it("overlays core prospect colours onto config theme", () => {
    const prospect = makeProspect({
      primaryColor: "#ff0000",
      primaryHoverColor: "#cc0000",
      accentColor: "#00ff00",
    });
    const configTheme = { primaryColor: "#old", extra: "kept" };
    const result = hydrateProspectTheme(prospect, configTheme, null);
    expect(result).toMatchObject({
      primaryColor: "#ff0000",
      primaryHoverColor: "#cc0000",
      accentColor: "#00ff00",
      extra: "kept",
    });
  });

  it("overlays extended palette when prospect has non-null values", () => {
    const prospect = makeProspect({
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foreground: "#000000",
      mutedTextColor: "#999999",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
    const configTheme = { primaryColor: "#old" };
    const result = hydrateProspectTheme(prospect, configTheme, null);
    expect(result).toMatchObject({
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foregroundColor: "#000000",
      mutedTextColor: "#999999",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
  });

  it("does not override config values when prospect extended fields are null", () => {
    const prospect = makeProspect(); // all extended fields null
    const configTheme = {
      primaryColor: "#old",
      pageBackground: "#from-config",
      foregroundColor: "#from-config",
    };
    const result = hydrateProspectTheme(prospect, configTheme, null);
    expect(result!.pageBackground).toBe("#from-config");
    expect(result!.foregroundColor).toBe("#from-config");
  });

  it("uses foregroundKey option for checkouts (foreground instead of foregroundColor)", () => {
    const prospect = makeProspect({ foreground: "#000" });
    const result = hydrateProspectTheme(prospect, {}, null, {
      foregroundKey: "foreground",
    });
    expect(result).toHaveProperty("foreground", "#000");
    expect(result).not.toHaveProperty("foregroundColor");
  });

  it("themeOverrides win over prospect values", () => {
    const prospect = makeProspect({ primaryColor: "#prospect" });
    const overrides = { primaryColor: "#override" };
    const result = hydrateProspectTheme(
      prospect,
      {} as Record<string, unknown>,
      overrides,
    );
    expect(result!.primaryColor).toBe("#override");
  });
});

describe("prospectLogoUrl", () => {
  it("returns undefined when prospect is null", () => {
    expect(prospectLogoUrl(null)).toBeUndefined();
  });

  it("returns the logoUrl when prospect.logo is custom", () => {
    const prospect = makeProspect({
      logo: "custom",
      logoUrl: "https://example.com/logo.svg",
    });
    expect(prospectLogoUrl(prospect)).toBe("https://example.com/logo.svg");
  });

  it("returns undefined when prospect.logo is dynamic", () => {
    const prospect = makeProspect({ logo: "dynamic", logoUrl: null });
    expect(prospectLogoUrl(prospect)).toBeUndefined();
  });

  it("returns undefined when logo is custom but logoUrl is null", () => {
    const prospect = makeProspect({ logo: "custom", logoUrl: null });
    expect(prospectLogoUrl(prospect)).toBeUndefined();
  });
});
