import { describe, expect, it } from "vitest";
import { isAddress } from "viem";
import { addressFor, makeWallet } from "../lib/backend/sim";

describe("staged simulation", () => {
  it("derives the same checksummed address for the same email, every run", () => {
    const a = addressFor("aisyah.rahman@example.com");
    expect(a).toBe(addressFor("aisyah.rahman@example.com"));
    expect(isAddress(a, { strict: true })).toBe(true);
    expect(a).not.toBe(addressFor("someone.else@example.com"));
  });

  it("models a 2-of-2 with one client share, one server share and an encrypted backup", () => {
    const w = makeWallet("aisyah.rahman@example.com", 1000);
    expect(w.scheme).toBe("TWO_OF_TWO");
    expect(w.shares.map((s) => s.location)).toEqual(["device", "enclave", "backup"]);
    expect(w.shares.every((s) => s.encrypted)).toBe(true);
    expect(w.backup.location).toBe("dynamic");
  });
});
