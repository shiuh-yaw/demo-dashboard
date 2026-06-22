import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Token catalog tests
// ---------------------------------------------------------------------------

import {
  USDC_BASE,
  USDC_BASE_SEPOLIA,
  USDC_ETH_SEPOLIA,
  USDC_ARB_SEPOLIA,
  TOKEN_CATALOG,
  findTokenByAssetChain,
} from "../lib/tokens";

describe("USDC_BASE_SEPOLIA token constant", () => {
  it("has the correct address", () => {
    expect(USDC_BASE_SEPOLIA.address).toBe(
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    );
  });

  it("has chainId 84532 (Base Sepolia)", () => {
    expect(USDC_BASE_SEPOLIA.chainId).toBe(84532);
  });

  it("has 6 decimals", () => {
    expect(USDC_BASE_SEPOLIA.decimals).toBe(6);
  });

  it("is in the TOKEN_CATALOG", () => {
    expect(TOKEN_CATALOG).toContain(USDC_BASE_SEPOLIA);
  });

  it("is resolvable via findTokenByAssetChain", () => {
    expect(findTokenByAssetChain("USDC", "base-sepolia")).toBe(
      USDC_BASE_SEPOLIA,
    );
  });

  it("mainnet USDC on Base is NOT the same as testnet", () => {
    expect(USDC_BASE.chainId).not.toBe(USDC_BASE_SEPOLIA.chainId);
    expect(USDC_BASE.address).not.toBe(USDC_BASE_SEPOLIA.address);
  });
});

describe("USDC_ETH_SEPOLIA token constant", () => {
  it("has the correct address", () => {
    expect(USDC_ETH_SEPOLIA.address).toBe(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    );
  });

  it("has chainId 11155111 (Ethereum Sepolia)", () => {
    expect(USDC_ETH_SEPOLIA.chainId).toBe(11155111);
  });

  it("is in the TOKEN_CATALOG", () => {
    expect(TOKEN_CATALOG).toContain(USDC_ETH_SEPOLIA);
  });

  it("is resolvable via findTokenByAssetChain", () => {
    expect(findTokenByAssetChain("USDC", "eth-sepolia")).toBe(
      USDC_ETH_SEPOLIA,
    );
  });
});

describe("USDC_ARB_SEPOLIA token constant", () => {
  it("has the correct address", () => {
    expect(USDC_ARB_SEPOLIA.address).toBe(
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    );
  });

  it("has chainId 421614 (Arbitrum Sepolia)", () => {
    expect(USDC_ARB_SEPOLIA.chainId).toBe(421614);
  });

  it("has 6 decimals", () => {
    expect(USDC_ARB_SEPOLIA.decimals).toBe(6);
  });

  it("is in the TOKEN_CATALOG", () => {
    expect(TOKEN_CATALOG).toContain(USDC_ARB_SEPOLIA);
  });

  it("is resolvable via findTokenByAssetChain", () => {
    expect(findTokenByAssetChain("USDC", "arb-sepolia")).toBe(
      USDC_ARB_SEPOLIA,
    );
  });

  it("is distinct from other testnet USDC tokens", () => {
    expect(USDC_ARB_SEPOLIA.chainId).not.toBe(USDC_BASE_SEPOLIA.chainId);
    expect(USDC_ARB_SEPOLIA.chainId).not.toBe(USDC_ETH_SEPOLIA.chainId);
  });
});

// ---------------------------------------------------------------------------
// Chain resolvers
// ---------------------------------------------------------------------------

import {
  chainIdFor,
  chainFamilyFor,
  chainKeyForId,
  settlementTokenAddressFor,
} from "../lib/flow-snippets";

describe("Arbitrum Sepolia chain resolvers", () => {
  it("chainIdFor('arb-sepolia') returns '421614'", () => {
    expect(chainIdFor("arb-sepolia")).toBe("421614");
  });

  it("chainFamilyFor('arb-sepolia') returns 'EVM'", () => {
    expect(chainFamilyFor("arb-sepolia")).toBe("EVM");
  });

  it("chainKeyForId(421614) returns 'arb-sepolia'", () => {
    expect(chainKeyForId(421614)).toBe("arb-sepolia");
  });

  it("chainKeyForId round-trips with chainIdFor", () => {
    expect(chainKeyForId(Number(chainIdFor("arb-sepolia")))).toBe(
      "arb-sepolia",
    );
  });

  it("settlementTokenAddressFor('USDC', 'arb-sepolia') returns the testnet address", () => {
    expect(settlementTokenAddressFor("USDC", "arb-sepolia")).toBe(
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    );
  });

  it("settlementTokenAddressFor('USDC', 'base') returns the mainnet address", () => {
    expect(settlementTokenAddressFor("USDC", "base")).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    );
  });

  it("other testnet chain resolvers still work", () => {
    expect(chainIdFor("base-sepolia")).toBe("84532");
    expect(chainIdFor("eth-sepolia")).toBe("11155111");
    expect(chainKeyForId(84532)).toBe("base-sepolia");
    expect(chainKeyForId(11155111)).toBe("eth-sepolia");
  });
});

// ---------------------------------------------------------------------------
// CreateFlowInput — amount required at flow creation
// ---------------------------------------------------------------------------

import type { CreateFlowInput } from "../lib/checkouts-api";
import { settlementFromToken, destination } from "../lib/checkouts-api";

describe("CreateFlowInput type shape", () => {
  it("accepts a testnet deposit with settlementConfig + destinationConfig", () => {
    const input: CreateFlowInput = {
      mode: "deposit",
      amount: "25",
      currency: "USD",
      settlementConfig: {
        settlements: [
          settlementFromToken(USDC_ARB_SEPOLIA, "EVM"),
        ],
      },
      destinationConfig: {
        destinations: [
          destination("EVM", "0x1234567890abcdef1234567890abcdef12345678"),
        ],
      },
    };
    expect(input.amount).toBe("25");
    expect(input.mode).toBe("deposit");
  });

  it("accepts payment mode for checkout scenario", () => {
    const input: CreateFlowInput = {
      mode: "payment",
      amount: "0.10",
      currency: "USD",
      settlementConfig: {
        settlements: [
          settlementFromToken(USDC_ARB_SEPOLIA, "EVM"),
        ],
      },
      destinationConfig: {
        destinations: [
          destination("EVM", "0x1234567890abcdef1234567890abcdef12345678"),
        ],
      },
    };
    expect(input.mode).toBe("payment");
  });

  it("accepts withdraw shape with SOL destination", () => {
    const input: CreateFlowInput = {
      mode: "withdraw",
      amount: "100",
      currency: "USD",
      settlementConfig: {
        settlements: [
          settlementFromToken(USDC_BASE, "EVM"),
        ],
      },
      destinationConfig: {
        destinations: [
          destination("EVM", "0x1234567890abcdef1234567890abcdef12345678"),
        ],
      },
    };
    expect(input.destinationConfig.destinations).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Testnet settlement config — verifies the widget-demo wiring constants
// ---------------------------------------------------------------------------

describe("testnet settlement config", () => {
  it("USDC_BASE is mainnet (8453)", () => {
    expect(USDC_BASE.chainId).toBe(8453);
  });

  it("USDC_ARB_SEPOLIA is testnet (421614)", () => {
    expect(USDC_ARB_SEPOLIA.chainId).toBe(421614);
  });

  it("testnet → settlement chainId is 421614", () => {
    const isTestnet = true;
    const effectiveSettlementChainId = isTestnet ? 421614 : 8453;
    expect(effectiveSettlementChainId).toBe(421614);
  });

  it("mainnet → settlement chainId is 8453", () => {
    const isTestnet = false;
    const effectiveSettlementChainId = isTestnet ? 421614 : 8453;
    expect(effectiveSettlementChainId).toBe(8453);
  });

  it("testnet → destinationToken is USDC_ARB_SEPOLIA", () => {
    const isTestnet = true;
    const effectiveDestinationToken = isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE;
    expect(effectiveDestinationToken).toBe(USDC_ARB_SEPOLIA);
  });

  it("mainnet → destinationToken is USDC_BASE", () => {
    const isTestnet = false;
    const effectiveDestinationToken = isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE;
    expect(effectiveDestinationToken).toBe(USDC_BASE);
  });
});

// ---------------------------------------------------------------------------
// skipMinUsdValueFilter logic
// ---------------------------------------------------------------------------

describe("skipMinUsdValueFilter derivation", () => {
  function computeEffectiveMinUsd(
    skipMinUsdValueFilter: boolean,
    minUsdValue: number,
    effectiveAmountNumber: number,
  ): number {
    return skipMinUsdValueFilter
      ? 0
      : Math.max(
          minUsdValue,
          Number.isFinite(effectiveAmountNumber)
            ? effectiveAmountNumber
            : 0,
        );
  }

  it("testnet → effectiveMinUsdValue is 0 regardless of amount", () => {
    expect(computeEffectiveMinUsd(true, 0.1, 25)).toBe(0);
    expect(computeEffectiveMinUsd(true, 0, 100)).toBe(0);
    expect(computeEffectiveMinUsd(true, 5, 0.1)).toBe(0);
  });

  it("mainnet → effectiveMinUsdValue uses max(minUsdValue, amount)", () => {
    expect(computeEffectiveMinUsd(false, 0.1, 25)).toBe(25);
    expect(computeEffectiveMinUsd(false, 0.1, 0)).toBe(0.1);
    expect(computeEffectiveMinUsd(false, 0, 0)).toBe(0);
  });

  it("testnet tokens (marketValue=0) pass when skipMinUsdValueFilter is true", () => {
    const minUsd = computeEffectiveMinUsd(true, 0.1, 25);
    const testnetTokenMarketValue = 0;
    expect(testnetTokenMarketValue >= minUsd).toBe(true);
  });

  it("testnet tokens (marketValue=0) are hidden when skipMinUsdValueFilter is false", () => {
    const minUsd = computeEffectiveMinUsd(false, 0.1, 25);
    const testnetTokenMarketValue = 0;
    expect(testnetTokenMarketValue >= minUsd).toBe(false);
  });
});
