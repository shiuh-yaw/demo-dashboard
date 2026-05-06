import { describe, expect, it } from "vitest";
import {
  hashBrandKey,
  isHexColor,
  normaliseHex,
} from "../hash";

describe("isHexColor", () => {
  it("accepts 6-digit lowercase hex", () => {
    expect(isHexColor("#ff00aa")).toBe(true);
  });
  it("accepts 6-digit uppercase hex", () => {
    expect(isHexColor("#FF00AA")).toBe(true);
  });
  it("accepts 3-digit shorthand hex", () => {
    expect(isHexColor("#abc")).toBe(true);
  });
  it("rejects missing hash", () => {
    expect(isHexColor("ff00aa")).toBe(false);
  });
  it("rejects non-hex characters", () => {
    expect(isHexColor("#gghhii")).toBe(false);
  });
  it("rejects non-strings", () => {
    expect(isHexColor(undefined)).toBe(false);
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor(123)).toBe(false);
    expect(isHexColor({})).toBe(false);
  });
});

describe("normaliseHex", () => {
  it("lowercases 6-digit hex", () => {
    expect(normaliseHex("#FF00AA")).toBe("#ff00aa");
  });
  it("expands 3-digit hex to 6 digits", () => {
    expect(normaliseHex("#abc")).toBe("#aabbcc");
  });
  it("is idempotent", () => {
    const once = normaliseHex("#FF00AA");
    expect(normaliseHex(once)).toBe(once);
  });
});

describe("hashBrandKey", () => {
  it("returns the same id for the same inputs", () => {
    const a = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: "https://x/logo.png",
    });
    const b = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: "https://x/logo.png",
    });
    expect(a).toBe(b);
  });
  it("treats mixed-case hex as the same brand", () => {
    const lower = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    const upper = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#FF0000",
      logoUrl: null,
    });
    expect(lower).toBe(upper);
  });
  it("treats short and expanded hex as the same brand", () => {
    const short = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#f00",
      logoUrl: null,
    });
    const long = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    expect(short).toBe(long);
  });
  it("treats null and undefined logoUrl identically", () => {
    const a = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    const b = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: undefined,
    });
    expect(a).toBe(b);
  });
  it("returns different ids for different owners", () => {
    const owner1 = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    const owner2 = hashBrandKey({
      ownerId: "user_2",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    expect(owner1).not.toBe(owner2);
  });
  it("returns different ids for different colors", () => {
    const red = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    const blue = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#0000ff",
      logoUrl: null,
    });
    expect(red).not.toBe(blue);
  });
  it("returns different ids for different logo urls", () => {
    const a = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: "https://x/a.png",
    });
    const b = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: "https://x/b.png",
    });
    expect(a).not.toBe(b);
  });
  it("produces an id matching cuid-ish length so Brand rows fit", () => {
    // We don't need a real cuid — just a stable, prefixed token short
    // enough to fit the schema's String id. ~24 hex chars + prefix.
    const id = hashBrandKey({
      ownerId: "user_1",
      primaryColor: "#ff0000",
      logoUrl: null,
    });
    expect(id).toMatch(/^bf_[a-f0-9]{24}$/);
  });
});
