import { describe, expect, it } from "vitest";

import {
  corsHeadersForOrigin,
  isBuiltinTrackOrigin,
  parseTrackCorsOrigins,
} from "@/lib/track-cors";

describe("parseTrackCorsOrigins", () => {
  it("splits, trims, lowercases, and drops blanks", () => {
    expect(
      parseTrackCorsOrigins(
        " https://Wallet.dynamic.dev , https://earn.dynamic.dev,,",
      ),
    ).toEqual(["https://wallet.dynamic.dev", "https://earn.dynamic.dev"]);
  });

  it("returns an empty list for undefined/empty", () => {
    expect(parseTrackCorsOrigins(undefined)).toEqual([]);
    expect(parseTrackCorsOrigins("")).toEqual([]);
  });
});

describe("corsHeadersForOrigin", () => {
  const allowed = ["https://wallet.dynamic.dev"];

  it("reflects an allowlisted origin verbatim with Vary: Origin", () => {
    const headers = corsHeadersForOrigin("https://wallet.dynamic.dev", allowed);
    expect(headers).not.toBeNull();
    expect(headers!["Access-Control-Allow-Origin"]).toBe(
      "https://wallet.dynamic.dev",
    );
    expect(headers!["Vary"]).toBe("Origin");
    // sendBeacon drains with credentials: "include" - the cross-origin
    // beacon needs this alongside the reflected (non-"*") origin.
    expect(headers!["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("is case-insensitive against the allowlist", () => {
    const headers = corsHeadersForOrigin("https://Wallet.dynamic.dev", allowed);
    expect(headers).not.toBeNull();
  });

  it("returns null for a non-allowlisted origin", () => {
    expect(corsHeadersForOrigin("https://evil.example", allowed)).toBeNull();
  });

  it("returns null when origin is missing", () => {
    expect(corsHeadersForOrigin(null, allowed)).toBeNull();
  });

  it("returns null for an external origin when the allowlist is empty", () => {
    expect(corsHeadersForOrigin("https://partner.example.com", [])).toBeNull();
  });

  it("always allows https dynamic.dev subdomains regardless of the allowlist", () => {
    const headers = corsHeadersForOrigin("https://wallet.dynamic.dev", []);
    expect(headers).not.toBeNull();
    expect(headers!["Access-Control-Allow-Origin"]).toBe(
      "https://wallet.dynamic.dev",
    );
  });
});

describe("isBuiltinTrackOrigin", () => {
  it("allows the apex and true subdomains over https", () => {
    expect(isBuiltinTrackOrigin("https://dynamic.dev")).toBe(true);
    expect(isBuiltinTrackOrigin("https://wallet.dynamic.dev")).toBe(true);
    expect(isBuiltinTrackOrigin("https://a.b.dynamic.dev")).toBe(true);
  });

  it("rejects lookalike hosts on a non-boundary match", () => {
    expect(isBuiltinTrackOrigin("https://evildynamic.dev")).toBe(false);
    expect(isBuiltinTrackOrigin("https://dynamic.dev.evil.com")).toBe(false);
    expect(isBuiltinTrackOrigin("https://wallet.dynamic.devx")).toBe(false);
  });

  it("rejects non-https and garbage origins", () => {
    expect(isBuiltinTrackOrigin("http://wallet.dynamic.dev")).toBe(false);
    expect(isBuiltinTrackOrigin("null")).toBe(false);
    expect(isBuiltinTrackOrigin("not-a-url")).toBe(false);
  });
});
