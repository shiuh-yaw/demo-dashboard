import { describe, it, expect } from "vitest";
import { getChainIcon } from "../src/lib/chain-icons";

describe("getChainIcon", () => {
  describe("mainnet chains", () => {
    it.each([
      [1, "Ethereum"],
      [8453, "Base"],
      [137, "Polygon"],
      [42161, "Arbitrum"],
      [10, "Optimism"],
      [56, "BNB"],
    ])("returns an icon for chainId %d (%s)", (chainId) => {
      expect(getChainIcon(chainId)).not.toBeNull();
    });
  });

  describe("testnet chains", () => {
    it.each([
      [11155111, "Ethereum Sepolia"],
      [84532, "Base Sepolia"],
      [421614, "Arbitrum Sepolia"],
      [11155420, "OP Sepolia"],
    ])("returns an icon for chainId %d (%s)", (chainId) => {
      expect(getChainIcon(chainId)).not.toBeNull();
    });

    it("Ethereum Sepolia uses the same icon as Ethereum mainnet", () => {
      expect(getChainIcon(11155111)).toBe(getChainIcon(1));
    });

    it("Base Sepolia uses the same icon as Base mainnet", () => {
      expect(getChainIcon(84532)).toBe(getChainIcon(8453));
    });

    it("Arbitrum Sepolia uses the same icon as Arbitrum mainnet", () => {
      expect(getChainIcon(421614)).toBe(getChainIcon(42161));
    });

    it("OP Sepolia uses the same icon as Optimism mainnet", () => {
      expect(getChainIcon(11155420)).toBe(getChainIcon(10));
    });
  });

  it("returns null for unknown chain IDs", () => {
    expect(getChainIcon(999999)).toBeNull();
  });
});
