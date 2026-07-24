/**
 * URL-param destination override resolver.
 *
 * network keys map onto lib/tokens.ts via findTokenByAssetChain; the
 * to_address must match the resolved chain family (EVM / SOL) or the
 * override is rejected so a malformed link falls back to the default.
 */

import { describe, expect, it } from "vitest";

import {
  isValidAddressForFamily,
  resolveAddressOverride,
  resolveDestinationOverride,
} from "@/lib/destination-override";

const EVM_ADDR = "0x5C260969b90152a46D52BC476C94524C8E796b3d";
const SOL_ADDR = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

describe("isValidAddressForFamily", () => {
  it("accepts a well-formed EVM address for EVM", () => {
    expect(isValidAddressForFamily(EVM_ADDR, "EVM")).toBe(true);
  });
  it("rejects a non-hex / wrong-length string for EVM", () => {
    expect(isValidAddressForFamily("0x1234", "EVM")).toBe(false);
    expect(isValidAddressForFamily(SOL_ADDR, "EVM")).toBe(false);
  });
  it("accepts a base58 address for SOL", () => {
    expect(isValidAddressForFamily(SOL_ADDR, "SOL")).toBe(true);
  });
  it("rejects an EVM 0x address for SOL", () => {
    expect(isValidAddressForFamily(EVM_ADDR, "SOL")).toBe(false);
  });
  it("rejects an unknown family instead of assuming EVM", () => {
    expect(isValidAddressForFamily(EVM_ADDR, "TRON")).toBe(false);
  });
});

describe("resolveDestinationOverride", () => {
  it("resolves an EVM network + address to a token + family", () => {
    const o = resolveDestinationOverride(
      { network: "base", to_address: EVM_ADDR },
      "USDC",
    );
    expect(o).not.toBeNull();
    expect(o?.address).toBe(EVM_ADDR);
    expect(o?.chainFamily).toBe("EVM");
    expect(o?.networkKey).toBe("base");
    expect(o?.token.chainId).toBe(8453);
    expect(o?.token.symbol).toBe("USDC");
  });

  it("resolves a Solana network + base58 address", () => {
    const o = resolveDestinationOverride(
      { network: "solana", to_address: SOL_ADDR },
      "USDC",
    );
    expect(o?.chainFamily).toBe("SOL");
    expect(o?.token.chainId).toBe(101);
  });

  it("rejects a family mismatch (SOL network, EVM address)", () => {
    expect(
      resolveDestinationOverride(
        { network: "solana", to_address: EVM_ADDR },
        "USDC",
      ),
    ).toBeNull();
  });

  it("rejects an unknown network", () => {
    expect(
      resolveDestinationOverride(
        { network: "dogechain", to_address: EVM_ADDR },
        "USDC",
      ),
    ).toBeNull();
  });

  it("returns null when either param is missing", () => {
    expect(
      resolveDestinationOverride({ network: "base" }, "USDC"),
    ).toBeNull();
    expect(
      resolveDestinationOverride({ to_address: EVM_ADDR }, "USDC"),
    ).toBeNull();
    expect(resolveDestinationOverride({}, "USDC")).toBeNull();
  });

  it("reads from a URLSearchParams instance", () => {
    const params = new URLSearchParams({
      network: "base",
      to_address: EVM_ADDR,
    });
    expect(resolveDestinationOverride(params, "USDC")?.chainFamily).toBe(
      "EVM",
    );
  });
});

describe("resolveAddressOverride", () => {
  it("returns a valid EVM address for the EVM family", () => {
    expect(
      resolveAddressOverride({ to_address: EVM_ADDR }, "EVM"),
    ).toBe(EVM_ADDR);
  });
  it("returns null for a malformed address", () => {
    expect(
      resolveAddressOverride({ to_address: "nope" }, "EVM"),
    ).toBeNull();
  });
  it("returns null when to_address is absent", () => {
    expect(resolveAddressOverride({}, "EVM")).toBeNull();
  });
  it("ignores the network param entirely", () => {
    expect(
      resolveAddressOverride(
        { network: "solana", to_address: EVM_ADDR },
        "EVM",
      ),
    ).toBe(EVM_ADDR);
  });
});
