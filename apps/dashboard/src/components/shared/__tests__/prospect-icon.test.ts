/**
 * Unit tests for ProspectIcon's pure helpers (favicon URL + fallback letter).
 * The component itself renders an `img`/`span` and is exercised via the
 * picker/list-row integration; these cover the normalization logic only.
 */

import { describe, expect, it } from "vitest";

import {
  fallbackLetter,
  faviconUrl,
  normalizeDomain,
} from "../prospect-icon";

describe("normalizeDomain", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });

  it("passes through a bare lowercase domain", () => {
    expect(normalizeDomain("acme.example")).toBe("acme.example");
  });

  it("lowercases a mixed-case domain", () => {
    expect(normalizeDomain("Acme.Example")).toBe("acme.example");
  });

  it("strips the protocol from a full URL", () => {
    expect(normalizeDomain("https://acme.example")).toBe("acme.example");
    expect(normalizeDomain("http://acme.example")).toBe("acme.example");
  });

  it("strips path, query, and hash segments", () => {
    expect(normalizeDomain("https://acme.example/pricing")).toBe(
      "acme.example",
    );
    expect(normalizeDomain("acme.example/pricing?ref=demo")).toBe(
      "acme.example",
    );
    expect(normalizeDomain("acme.example#section")).toBe("acme.example");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDomain("  acme.example  ")).toBe("acme.example");
  });
});

describe("faviconUrl", () => {
  it("returns null when there is no domain", () => {
    expect(faviconUrl(null)).toBeNull();
    expect(faviconUrl(undefined)).toBeNull();
    expect(faviconUrl("")).toBeNull();
  });

  it("builds the Google s2 favicon URL at sz=64 for a bare domain", () => {
    expect(faviconUrl("acme.example")).toBe(
      "https://www.google.com/s2/favicons?domain=acme.example&sz=64",
    );
  });

  it("normalizes a full URL with protocol/path before building the URL", () => {
    expect(faviconUrl("https://Acme.Example/pricing")).toBe(
      "https://www.google.com/s2/favicons?domain=acme.example&sz=64",
    );
  });
});

describe("fallbackLetter", () => {
  it("uppercases the first letter of the name", () => {
    expect(fallbackLetter("acme corp")).toBe("A");
    expect(fallbackLetter("Zephyr")).toBe("Z");
  });

  it("trims leading whitespace before taking the first letter", () => {
    expect(fallbackLetter("  nova")).toBe("N");
  });

  it("falls back to a question mark for an empty name", () => {
    expect(fallbackLetter("")).toBe("?");
    expect(fallbackLetter("   ")).toBe("?");
  });
});
