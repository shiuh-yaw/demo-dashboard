/**
 * Withdraw wallet anchor invariant tests.
 *
 * The withdraw flow's embedded wallet is anchored on Solana (not EVM/Base).
 * These tests guard against accidental chain-anchor regressions — the
 * kind of silent misconfiguration that causes "destination error" or
 * "confirmation failed" at runtime.
 *
 * Covers:
 * - USDC_ON_SOLANA exported from settlement-options is Solana (chainId 101)
 * - Default flow config for withdraw targets Solana
 * - Settlement options include Solana rows
 */

import { describe, expect, it } from "vitest";

import {
  SETTLEMENT_OPTIONS,
  CHAIN_OPTIONS,
  USDC_ON_SOLANA,
} from "@/app/withdraw/settlement-options";
import { DEFAULT_FLOW_CONFIGS } from "@/lib/flow-config/defaults";
import { USDC_SOLANA } from "@/lib/tokens";
import { DYNAMIC_SOLANA_NETWORK_ID } from "@dynamic-demos/checkouts-widget";

describe("withdraw wallet anchor", () => {
  it("USDC_ON_SOLANA matches USDC_SOLANA from the token catalog", () => {
    expect(USDC_ON_SOLANA.chainId).toBe(USDC_SOLANA.chainId);
    expect(USDC_ON_SOLANA.address).toBe(USDC_SOLANA.address);
    expect(USDC_ON_SOLANA.symbol).toBe("USDC");
  });

  it("USDC_ON_SOLANA uses the Dynamic Solana network id (101)", () => {
    expect(USDC_ON_SOLANA.chainId).toBe(DYNAMIC_SOLANA_NETWORK_ID);
  });

  it("default withdraw flow config targets solana", () => {
    const cfg = DEFAULT_FLOW_CONFIGS.withdraw;
    expect(cfg.asset.chain).toBe("solana");
    expect(cfg.asset.symbol).toBe("USDC");
  });

  it("settlement options include at least one Solana row", () => {
    const solRows = SETTLEMENT_OPTIONS.filter((o) => o.chainFamily === "SOL");
    expect(solRows.length).toBeGreaterThanOrEqual(1);
  });

  it("chain options include a solana entry", () => {
    const sol = CHAIN_OPTIONS.find((c) => c.chainKey === "solana");
    expect(sol).toBeDefined();
    expect(sol!.chainFamily).toBe("SOL");
  });
});
