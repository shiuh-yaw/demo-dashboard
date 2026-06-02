import { describe, it, expect } from "vitest";
import { isValidAddress } from "../lib/validate-address";

// A real, valid lowercase EVM address (non-checksummed) and the canonical
// Solana Token Program address (well-known public program, not a secret).
const EVM = "0x742d35cc6634c0532925a3b844bc454e4438f44e";
const SOLANA = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

describe("isValidAddress", () => {
  it("accepts a valid EVM address on the EVM chain (non-checksummed)", () => {
    expect(isValidAddress(EVM, "EVM")).toBe(true);
  });

  it("accepts a valid Solana address on a non-EVM chain", () => {
    expect(isValidAddress(SOLANA, "SVM")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidAddress(`  ${EVM}  `, "EVM")).toBe(true);
  });

  it("rejects a Solana address when the screen is on EVM", () => {
    expect(isValidAddress(SOLANA, "EVM")).toBe(false);
  });

  it("rejects an EVM address when the screen is on Solana", () => {
    expect(isValidAddress(EVM, "SVM")).toBe(false);
  });

  it("rejects a payment URI even though it contains an address", () => {
    expect(isValidAddress(`ethereum:${EVM}?value=1`, "EVM")).toBe(false);
  });

  it("rejects arbitrary text and URLs", () => {
    expect(isValidAddress("https://example.com", "EVM")).toBe(false);
    expect(isValidAddress("not an address", "SVM")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidAddress("", "EVM")).toBe(false);
    expect(isValidAddress("   ", "SVM")).toBe(false);
  });
});
