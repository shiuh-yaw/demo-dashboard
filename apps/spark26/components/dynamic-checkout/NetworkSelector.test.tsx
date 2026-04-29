import { describe, expect, it } from "vitest";
import type { NetworkData } from "@dynamic-labs-sdk/client";
import { _isWalletOnUnsupportedChain } from "./NetworkSelector";

function makeNetwork(args: {
  networkId: string;
  chain: string;
  displayName: string;
}): NetworkData {
  return {
    blockExplorerUrls: [],
    chain: args.chain as NetworkData["chain"],
    displayName: args.displayName,
    iconUrl: "",
    name: args.networkId,
    nativeCurrency: { decimals: 18, name: "N", symbol: "N" },
    networkId: args.networkId,
    rpcUrls: { http: [] },
    testnet: false,
  } as NetworkData;
}

describe("NetworkSelector helpers", () => {
  describe("_isWalletOnUnsupportedChain", () => {
    const ethereum = makeNetwork({
      networkId: "evm-1",
      chain: "EVM",
      displayName: "Ethereum",
    });
    const arbitrum = makeNetwork({
      networkId: "evm-42161",
      chain: "EVM",
      displayName: "Arbitrum",
    });
    const solana = makeNetwork({
      networkId: "solana-mainnet",
      chain: "SOL",
      displayName: "Solana",
    });

    it("returns false when the wallet's active chain is one of the enabled networks", () => {
      expect(
        _isWalletOnUnsupportedChain([ethereum, arbitrum], "EVM", ethereum),
      ).toBe(false);
    });

    it("returns true when the wallet is on a chain not in the enabled list", () => {
      const bsc = makeNetwork({
        networkId: "evm-56",
        chain: "EVM",
        displayName: "BNB Smart Chain",
      });
      expect(
        _isWalletOnUnsupportedChain([ethereum, arbitrum], "EVM", bsc),
      ).toBe(true);
    });

    it("returns false when no networks are enabled for this wallet's chain family", () => {
      // Solana-only project + EVM wallet — we don't render the selector at all,
      // so don't claim it's an unsupported chain.
      expect(
        _isWalletOnUnsupportedChain([solana], "EVM", ethereum),
      ).toBe(false);
    });

    it("returns false when active network is undefined (SDK hasn't resolved yet)", () => {
      expect(
        _isWalletOnUnsupportedChain([ethereum, arbitrum], "EVM", undefined),
      ).toBe(false);
    });

    it("ignores networks from other chain families when filtering", () => {
      // If the project has both EVM and Solana enabled, the wallet is an EVM
      // wallet on a non-enabled EVM chain, the Solana entry must not
      // accidentally make it "supported".
      const bsc = makeNetwork({
        networkId: "evm-56",
        chain: "EVM",
        displayName: "BNB Smart Chain",
      });
      expect(
        _isWalletOnUnsupportedChain([ethereum, solana], "EVM", bsc),
      ).toBe(true);
    });
  });
});
