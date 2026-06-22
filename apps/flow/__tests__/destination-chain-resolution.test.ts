/**
 * Destination chain resolution tests.
 *
 * Both /checkout and /deposit derive the settlement + destination
 * configs directly in the Dynamic Flow API shape — `settlementConfig`
 * and `destinationConfig` — from the wallet's `chain` property
 * (passed via the `onWalletConnected(address, chain)` callback) and
 * the resolved settlement `Token`.
 *
 * These tests guard against regressions where:
 *  - destinationChain is hardcoded to "EVM", causing the Flow API to
 *    reject Solana addresses with "Invalid destination address … for
 *    chain EVM".
 *  - the route body drifts from the Dynamic Flow API's expected shape.
 *  - new chain families (e.g. TRON) can't be added without route changes.
 */

import { describe, expect, it } from "vitest";

import {
  USDC_BASE,
  USDC_SOLANA,
  USDC_ARB_SEPOLIA,
  chainFamilyForId,
} from "@/lib/tokens";
import { settlementFromToken, destination } from "@/lib/checkouts-api";
import type { Token } from "@dynamic-demos/checkouts-widget";

// ---------------------------------------------------------------------------
// Helpers that mirror the widget-demo resolution logic
// ---------------------------------------------------------------------------

function resolveSettlementToken(
  isTestnet: boolean,
  walletChain: string,
): Token {
  if (isTestnet) return USDC_ARB_SEPOLIA;
  if (walletChain === "SOL") return USDC_SOLANA;
  return USDC_BASE;
}

function resolveDestinationChainName(
  isTestnet: boolean,
  walletChain: string,
): string {
  return isTestnet ? "EVM" : walletChain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("destination chain resolution from wallet chain", () => {
  // ---- Destination chain name ----

  it("SOL wallet on mainnet resolves destinationChain to SOL", () => {
    expect(resolveDestinationChainName(false, "SOL")).toBe("SOL");
  });

  it("EVM wallet on mainnet resolves destinationChain to EVM", () => {
    expect(resolveDestinationChainName(false, "EVM")).toBe("EVM");
  });

  it("testnet forces destinationChain to EVM regardless of wallet chain", () => {
    expect(resolveDestinationChainName(true, "SOL")).toBe("EVM");
    expect(resolveDestinationChainName(true, "EVM")).toBe("EVM");
  });

  it("any chain family string (e.g. TRON) passes through on mainnet", () => {
    expect(resolveDestinationChainName(false, "TRON")).toBe("TRON");
  });

  // ---- Settlement token ----

  it("SOL wallet on mainnet targets USDC on Solana (chainId 101)", () => {
    const token = resolveSettlementToken(false, "SOL");
    expect(token.chainId).toBe(101);
    expect(token.symbol).toBe("USDC");
    expect(token.address).toBe(USDC_SOLANA.address);
  });

  it("EVM wallet on mainnet targets USDC on Base (chainId 8453)", () => {
    const token = resolveSettlementToken(false, "EVM");
    expect(token.chainId).toBe(8453);
    expect(token.symbol).toBe("USDC");
    expect(token.address).toBe(USDC_BASE.address);
  });

  it("testnet targets USDC on Arb Sepolia regardless of wallet chain", () => {
    expect(resolveSettlementToken(true, "SOL").chainId).toBe(421614);
    expect(resolveSettlementToken(true, "EVM").chainId).toBe(421614);
  });
});

// ---------------------------------------------------------------------------
// chainFamilyForId — maps numeric chain ID → Dynamic chain family string
// ---------------------------------------------------------------------------

describe("chainFamilyForId", () => {
  it("Solana mainnet (101) → SOL", () => {
    expect(chainFamilyForId(101)).toBe("SOL");
  });

  it("Base (8453) → EVM", () => {
    expect(chainFamilyForId(8453)).toBe("EVM");
  });

  it("Arb Sepolia (421614) → EVM", () => {
    expect(chainFamilyForId(421614)).toBe("EVM");
  });

  it("Ethereum (1) → EVM", () => {
    expect(chainFamilyForId(1)).toBe("EVM");
  });

  it("unknown chain ID defaults to EVM", () => {
    expect(chainFamilyForId(99999)).toBe("EVM");
  });
});

// ---------------------------------------------------------------------------
// settlementFromToken — builds the Dynamic API settlement shape
// ---------------------------------------------------------------------------

describe("settlementFromToken", () => {
  it("builds correct shape from USDC_BASE", () => {
    const s = settlementFromToken(USDC_BASE, "EVM");
    expect(s).toEqual({
      chainName: "EVM",
      chainId: "8453",
      symbol: "USDC",
      tokenAddress: USDC_BASE.address,
      tokenDecimals: 6,
    });
  });

  it("builds correct shape from USDC_SOLANA", () => {
    const s = settlementFromToken(USDC_SOLANA, "SOL");
    expect(s).toEqual({
      chainName: "SOL",
      chainId: "101",
      symbol: "USDC",
      tokenAddress: USDC_SOLANA.address,
      tokenDecimals: 6,
    });
  });

  it("uses chainFamilyForId to derive chainName from token", () => {
    const token = USDC_ARB_SEPOLIA;
    const s = settlementFromToken(token, chainFamilyForId(token.chainId));
    expect(s.chainName).toBe("EVM");
    expect(s.chainId).toBe("421614");
  });
});

// ---------------------------------------------------------------------------
// destination — builds the Dynamic API destination shape
// ---------------------------------------------------------------------------

describe("destination", () => {
  it("builds EVM destination", () => {
    const d = destination("EVM", "0x5C260969b90152a46D52BC476C94524C8E796b3d");
    expect(d).toEqual({
      chainName: "EVM",
      type: "address",
      identifier: "0x5C260969b90152a46D52BC476C94524C8E796b3d",
    });
  });

  it("builds SOL destination", () => {
    const d = destination("SOL", "6ji7fuyespWcLKrymubqFUok6c8JZF9kUBmh6m1TeEh3");
    expect(d).toEqual({
      chainName: "SOL",
      type: "address",
      identifier: "6ji7fuyespWcLKrymubqFUok6c8JZF9kUBmh6m1TeEh3",
    });
  });

  it("works with any chain family string (e.g. TRON)", () => {
    const d = destination("TRON", "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9");
    expect(d.chainName).toBe("TRON");
    expect(d.type).toBe("address");
  });
});

// ---------------------------------------------------------------------------
// Full flow payload — end-to-end shape that goes to POST /api/checkouts
// ---------------------------------------------------------------------------

describe("full createFlow payload shape", () => {
  it("EVM wallet on mainnet produces correct payload", () => {
    const walletChain = "EVM";
    const walletAddr = "0x5C260969b90152a46D52BC476C94524C8E796b3d";
    const token = resolveSettlementToken(false, walletChain);
    const chainName = resolveDestinationChainName(false, walletChain);

    const payload = {
      mode: "payment" as const,
      amount: "25.00",
      currency: "USD",
      settlementConfig: {
        settlements: [settlementFromToken(token, chainFamilyForId(token.chainId))],
      },
      destinationConfig: {
        destinations: [destination(chainName, walletAddr)],
      },
    };

    const s = payload.settlementConfig.settlements[0]!;
    const d = payload.destinationConfig.destinations[0]!;
    expect(s.chainName).toBe("EVM");
    expect(s.chainId).toBe("8453");
    expect(d.chainName).toBe("EVM");
    expect(d.identifier).toBe(walletAddr);
  });

  it("SOL wallet on mainnet produces correct payload", () => {
    const walletChain = "SOL";
    const walletAddr = "6ji7fuyespWcLKrymubqFUok6c8JZF9kUBmh6m1TeEh3";
    const token = resolveSettlementToken(false, walletChain);
    const chainName = resolveDestinationChainName(false, walletChain);

    const payload = {
      mode: "deposit" as const,
      amount: "100",
      currency: "USD",
      settlementConfig: {
        settlements: [settlementFromToken(token, chainFamilyForId(token.chainId))],
      },
      destinationConfig: {
        destinations: [destination(chainName, walletAddr)],
      },
    };

    const s = payload.settlementConfig.settlements[0]!;
    const d = payload.destinationConfig.destinations[0]!;
    expect(s.chainName).toBe("SOL");
    expect(s.chainId).toBe("101");
    expect(s.tokenAddress).toBe(USDC_SOLANA.address);
    expect(d.chainName).toBe("SOL");
  });

  it("testnet forces EVM settlement + destination", () => {
    const walletChain = "SOL";
    const walletAddr = "6ji7fuyespWcLKrymubqFUok6c8JZF9kUBmh6m1TeEh3";
    const token = resolveSettlementToken(true, walletChain);
    const chainName = resolveDestinationChainName(true, walletChain);

    expect(token.chainId).toBe(421614);
    expect(chainFamilyForId(token.chainId)).toBe("EVM");
    expect(chainName).toBe("EVM");
  });
});

// ---------------------------------------------------------------------------
// Disconnect reset
// ---------------------------------------------------------------------------

describe("disconnect resets walletChain to EVM (default)", () => {
  it("all derived values should be EVM-flavored after disconnect", () => {
    let walletChain = "SOL";
    expect(resolveDestinationChainName(false, walletChain)).toBe("SOL");

    // Simulate disconnect
    walletChain = "EVM";
    expect(resolveDestinationChainName(false, walletChain)).toBe("EVM");
    const token = resolveSettlementToken(false, walletChain);
    expect(token.chainId).toBe(8453);
  });
});
