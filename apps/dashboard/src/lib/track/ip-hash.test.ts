import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { extractClientIp, hashIp } from "./ip-hash";

describe("extractClientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
    });
    expect(extractClientIp(headers)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9" });
    expect(extractClientIp(headers)).toBe("203.0.113.9");
  });

  it("returns null when neither header is present", () => {
    expect(extractClientIp(new Headers())).toBeNull();
  });
});

describe("hashIp", () => {
  it("matches sha256(ip + salt) hex digest", () => {
    const expected = createHash("sha256")
      .update("203.0.113.5test-salt")
      .digest("hex");
    expect(hashIp("203.0.113.5", "test-salt")).toBe(expected);
  });

  it("never returns the raw IP as a substring of the hash", () => {
    const hash = hashIp("203.0.113.5", "test-salt");
    expect(hash).not.toContain("203.0.113.5");
  });
});
