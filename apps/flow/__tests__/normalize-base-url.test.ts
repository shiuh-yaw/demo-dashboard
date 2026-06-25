import { describe, it, expect } from "vitest";

import { normalizeBaseUrl } from "../lib/normalize-base-url";

describe("normalizeBaseUrl", () => {
  it("returns undefined for blank / non-string values", () => {
    expect(normalizeBaseUrl(undefined)).toBeUndefined();
    expect(normalizeBaseUrl(null)).toBeUndefined();
    expect(normalizeBaseUrl("")).toBeUndefined();
    expect(normalizeBaseUrl("   ")).toBeUndefined();
    expect(normalizeBaseUrl(42)).toBeUndefined();
  });

  it("passes through a well-formed https URL", () => {
    expect(normalizeBaseUrl("https://dashboard.example.com")).toBe(
      "https://dashboard.example.com",
    );
  });

  it("prepends https:// when the scheme is missing", () => {
    expect(normalizeBaseUrl("dashboard.vercel.app")).toBe(
      "https://dashboard.vercel.app",
    );
  });

  it("preserves an explicit http:// scheme", () => {
    expect(normalizeBaseUrl("http://localhost:4000")).toBe(
      "http://localhost:4000",
    );
  });

  it("strips trailing slashes to avoid double-slash paths", () => {
    expect(normalizeBaseUrl("https://dashboard.vercel.app/")).toBe(
      "https://dashboard.vercel.app",
    );
    expect(normalizeBaseUrl("https://dashboard.vercel.app///")).toBe(
      "https://dashboard.vercel.app",
    );
  });

  it("strips wrapping quotes and surrounding whitespace (paste artifacts)", () => {
    expect(normalizeBaseUrl('  "https://dashboard.vercel.app/"  ')).toBe(
      "https://dashboard.vercel.app",
    );
    expect(normalizeBaseUrl("'https://dashboard.vercel.app'")).toBe(
      "https://dashboard.vercel.app",
    );
  });
});
