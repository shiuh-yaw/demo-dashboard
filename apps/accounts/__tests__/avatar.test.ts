import { describe, expect, it } from "vitest";
import {
  buildAvatarMetadata,
  faviconUrl,
  normalizeWebsite,
  readAccountAvatar,
} from "../lib/business-accounts/avatar";

describe("normalizeWebsite", () => {
  it("accepts a bare host, a www host, and a full URL with a path", () => {
    expect(normalizeWebsite("acme.com")).toBe("acme.com");
    expect(normalizeWebsite("www.acme.com")).toBe("www.acme.com");
    expect(normalizeWebsite("https://acme.com/teams?a=1")).toBe("acme.com");
    expect(normalizeWebsite("  HTTP://Acme.COM  ")).toBe("acme.com");
  });

  it("rejects anything that is not a hostname", () => {
    // No dot: "acme" would otherwise parse as a valid URL host.
    expect(normalizeWebsite("acme")).toBeNull();
    expect(normalizeWebsite("my site")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
    expect(normalizeWebsite("   ")).toBeNull();
  });

  it("strips a trailing dot, which is legal DNS but breaks the lookup", () => {
    expect(normalizeWebsite("acme.com.")).toBe("acme.com");
  });
});

describe("faviconUrl", () => {
  it("encodes the host and carries a size", () => {
    expect(faviconUrl("acme.com")).toContain("domain=acme.com");
    expect(faviconUrl("acme.com", 64)).toContain("sz=64");
  });
});

describe("buildAvatarMetadata", () => {
  it("stores the normalized host", () => {
    expect(buildAvatarMetadata({ website: "https://acme.com/x" })).toEqual({
      websiteUrl: "acme.com",
    });
  });

  it("returns undefined when there is nothing to store", () => {
    // Undefined keeps create on the plain SDK wrapper rather than the
    // lower-level client.
    expect(buildAvatarMetadata({})).toBeUndefined();
    expect(buildAvatarMetadata({ website: "  " })).toBeUndefined();
    expect(buildAvatarMetadata({ website: "not-a-host" })).toBeUndefined();
  });
});

describe("readAccountAvatar", () => {
  it("resolves a favicon from a stored website", () => {
    const avatar = readAccountAvatar({ websiteUrl: "acme.com" });
    expect(avatar.websiteUrl).toBe("acme.com");
    expect(avatar.src).toContain("domain=acme.com");
  });

  it("is defensive about whatever is actually on metadata", () => {
    // `metadata` is `object` in the SDK types and arbitrary at runtime.
    expect(readAccountAvatar(undefined)).toEqual({});
    expect(readAccountAvatar(null)).toEqual({});
    expect(readAccountAvatar("nope")).toEqual({});
    expect(readAccountAvatar({})).toEqual({});
    expect(readAccountAvatar({ websiteUrl: 42 })).toEqual({});
    expect(readAccountAvatar({ websiteUrl: "not-a-host" })).toEqual({});
  });
});
