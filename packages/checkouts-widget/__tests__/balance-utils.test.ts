import { describe, it, expect } from "vitest";
import {
  transformToTokenAssets,
  transformFlatBalancesToTokenAssets,
  type MultichainBalanceResponse,
  type FlatTokenBalance,
} from "../src/lib/balance-utils";
import {
  ZERO_ADDRESS,
  SOLANA_NATIVE_MINT,
  DYNAMIC_SOLANA_NETWORK_ID,
} from "../src/lib/chain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNestedResponse(
  networkId: number,
  tokens: Array<{
    symbol: string;
    balance?: string;
    marketValue?: string;
    address?: string;
    decimals?: number;
  }>,
): MultichainBalanceResponse {
  return {
    chainBalances: [
      {
        networks: [
          {
            networkId,
            balances: tokens.map((t) => ({
              symbol: t.symbol,
              name: t.symbol,
              balance: t.balance ?? "1",
              marketValue: t.marketValue ?? "1",
              address: t.address,
              decimals: t.decimals ?? 18,
            })),
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// transformToTokenAssets — native token sentinel tests
// ---------------------------------------------------------------------------

describe("transformToTokenAssets", () => {
  describe("native token address sentinel", () => {
    it("emits ZERO_ADDRESS for an EVM native token with undefined address", () => {
      const response = makeNestedResponse(8453, [
        { symbol: "ETH", address: undefined },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(ZERO_ADDRESS);
    });

    it("emits ZERO_ADDRESS for an EVM native token with empty-string address", () => {
      const response = makeNestedResponse(1, [
        { symbol: "ETH", address: "" },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(ZERO_ADDRESS);
    });

    it("emits ZERO_ADDRESS for an EVM native token already carrying ZERO_ADDRESS", () => {
      const response = makeNestedResponse(137, [
        { symbol: "MATIC", address: ZERO_ADDRESS },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(ZERO_ADDRESS);
    });

    it("emits SOLANA_NATIVE_MINT for a Solana native token with undefined address", () => {
      const response = makeNestedResponse(DYNAMIC_SOLANA_NETWORK_ID, [
        { symbol: "SOL", address: undefined },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(SOLANA_NATIVE_MINT);
    });

    it("emits SOLANA_NATIVE_MINT for a Solana native token already carrying SOLANA_NATIVE_MINT", () => {
      const response = makeNestedResponse(DYNAMIC_SOLANA_NETWORK_ID, [
        { symbol: "SOL", address: SOLANA_NATIVE_MINT },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(SOLANA_NATIVE_MINT);
    });

    it("preserves the contract address for a non-native EVM token", () => {
      const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const response = makeNestedResponse(1, [
        { symbol: "USDC", address: usdcAddress },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(usdcAddress);
    });

    it("preserves the mint address for a non-native Solana token", () => {
      const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const response = makeNestedResponse(DYNAMIC_SOLANA_NETWORK_ID, [
        { symbol: "USDC", address: usdcMint },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(usdcMint);
    });

    it("tokenAddress is never undefined for any returned asset", () => {
      const response = makeNestedResponse(8453, [
        { symbol: "ETH", address: undefined },
        { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      ]);
      const assets = transformToTokenAssets(response);
      for (const asset of assets) {
        expect(asset.tokenAddress).toBeDefined();
        expect(typeof asset.tokenAddress).toBe("string");
        expect(asset.tokenAddress.length).toBeGreaterThan(0);
      }
    });
  });

  describe("id field uses resolved tokenAddress", () => {
    it("native EVM token id uses ZERO_ADDRESS, not 'native'", () => {
      const response = makeNestedResponse(8453, [
        { symbol: "ETH", address: undefined },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets[0]!.id).toBe(`ETH-8453-${ZERO_ADDRESS}`);
    });

    it("native Solana token id uses SOLANA_NATIVE_MINT, not 'native'", () => {
      const response = makeNestedResponse(DYNAMIC_SOLANA_NETWORK_ID, [
        { symbol: "SOL", address: undefined },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets[0]!.id).toBe(`SOL-${DYNAMIC_SOLANA_NETWORK_ID}-${SOLANA_NATIVE_MINT}`);
    });
  });

  describe("filtering and sorting", () => {
    it("excludes zero-balance tokens by default", () => {
      const response = makeNestedResponse(1, [
        { symbol: "ETH", balance: "0", marketValue: "0" },
        { symbol: "USDC", balance: "100", marketValue: "100", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.symbol).toBe("USDC");
    });

    it("sorts by USD value, highest first", () => {
      const response = makeNestedResponse(1, [
        { symbol: "USDC", balance: "10", marketValue: "10", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
        { symbol: "ETH", balance: "1", marketValue: "2000" },
      ]);
      const assets = transformToTokenAssets(response);
      expect(assets[0]!.symbol).toBe("ETH");
      expect(assets[1]!.symbol).toBe("USDC");
    });
  });
});

// ---------------------------------------------------------------------------
// transformFlatBalancesToTokenAssets — native token sentinel tests
// (parity check with the nested function)
// ---------------------------------------------------------------------------

describe("transformFlatBalancesToTokenAssets", () => {
  describe("native token address sentinel", () => {
    it("emits ZERO_ADDRESS for EVM native token (isNative flag)", () => {
      const balances: FlatTokenBalance[] = [
        {
          networkId: 8453,
          address: "",
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
          logoURI: "",
          balance: 1,
          rawBalance: 1e18,
          isNative: true,
        },
      ];
      const assets = transformFlatBalancesToTokenAssets(balances);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(ZERO_ADDRESS);
    });

    it("emits SOLANA_NATIVE_MINT for Solana native token (isNative flag)", () => {
      const balances: FlatTokenBalance[] = [
        {
          networkId: DYNAMIC_SOLANA_NETWORK_ID,
          address: "",
          name: "SOL",
          symbol: "SOL",
          decimals: 9,
          logoURI: "",
          balance: 1,
          rawBalance: 1e9,
          isNative: true,
        },
      ];
      const assets = transformFlatBalancesToTokenAssets(balances);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.tokenAddress).toBe(SOLANA_NATIVE_MINT);
    });
  });
});
