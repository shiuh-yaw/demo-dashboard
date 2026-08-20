/**
 * Hardcoded refund addresses for deposit_address sources.
 *
 * A wrong-family address here silently strands refunds on the source
 * chain, so the constants are validated with the same guard the
 * Advanced override uses.
 */

import { describe, expect, it } from "vitest";

import { isValidRefundAddress } from "@/lib/deposit-address";
import {
  DEPOSIT_ADDRESS_REFUND_ADDRESSES,
  refundAddressForChain,
} from "@/lib/refund-addresses";

describe("DEPOSIT_ADDRESS_REFUND_ADDRESSES", () => {
  it("covers every source chain family the catalog offers", () => {
    const chains = DEPOSIT_ADDRESS_REFUND_ADDRESSES.map(
      (config) => config.chain,
    );
    expect(new Set(chains)).toEqual(new Set(["BTC", "EVM", "SOL"]));
  });

  it("holds a valid address for its own chain family", () => {
    for (const config of DEPOSIT_ADDRESS_REFUND_ADDRESSES) {
      expect(isValidRefundAddress(config.chain, config.address)).toBe(true);
    }
  });
});

describe("refundAddressForChain", () => {
  it("resolves the address for the source chain", () => {
    expect(refundAddressForChain("BTC", DEPOSIT_ADDRESS_REFUND_ADDRESSES)).toBe(
      "bc1qcy5w83f3fggtu8fxjytg8jhyne3p8d0xdrz7s0",
    );
    expect(refundAddressForChain("SOL", DEPOSIT_ADDRESS_REFUND_ADDRESSES)).toBe(
      "CivTE6ZNRPyvX53gR4gGwVPq1RfCh9o9tDrmWWN7t1zb",
    );
  });

  it("returns undefined for a chain with no entry", () => {
    expect(
      refundAddressForChain("TRON", DEPOSIT_ADDRESS_REFUND_ADDRESSES),
    ).toBeUndefined();
  });
});
