import { describe, it, expect } from "vitest";
import { displayHost } from "../display-host";

describe("displayHost", () => {
  it("strips protocol, www, query, and trailing slash", () => {
    expect(
      displayHost("https://www.newbalance.com.sg/?srsltid=AfmBOoq123"),
    ).toBe("newbalance.com.sg");
  });

  it("handles a missing protocol", () => {
    expect(displayHost("acme.com/pricing")).toBe("acme.com");
  });

  it("handles a bare host", () => {
    expect(displayHost("acme.com")).toBe("acme.com");
  });

  it("drops trailing slash", () => {
    expect(displayHost("http://acme.com/")).toBe("acme.com");
  });

  it("lowercases and strips hash", () => {
    expect(displayHost("https://Sub.Acme.COM/x?y#z")).toBe("sub.acme.com");
  });

  it("returns empty for null/blank", () => {
    expect(displayHost(null)).toBe("");
    expect(displayHost("   ")).toBe("");
  });
});
