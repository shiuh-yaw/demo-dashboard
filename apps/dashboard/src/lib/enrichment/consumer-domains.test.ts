import { describe, expect, it } from "vitest";
import { isBusinessDomain } from "./consumer-domains";

describe("isBusinessDomain", () => {
  it("accepts company domains", () => {
    expect(isBusinessDomain("dbs.com.sg")).toBe(true);
    expect(isBusinessDomain("acme.io")).toBe(true);
  });

  it("rejects free/consumer providers (case-insensitive)", () => {
    expect(isBusinessDomain("gmail.com")).toBe(false);
    expect(isBusinessDomain("GMAIL.com")).toBe(false);
    expect(isBusinessDomain("outlook.com")).toBe(false);
    expect(isBusinessDomain("proton.me")).toBe(false);
    expect(isBusinessDomain("icloud.com")).toBe(false);
  });

  it("rejects empty or dotless input", () => {
    expect(isBusinessDomain("")).toBe(false);
    expect(isBusinessDomain("localhost")).toBe(false);
  });
});
