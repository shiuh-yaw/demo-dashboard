import { describe, it, expect } from "vitest";
import {
  isTestnetChainId,
  isTestnetSupportedToken,
  TESTNET_CHAIN_IDS,
} from "../lib/testnet";

describe("testnet chain identification", () => {
  it("recognises Base Sepolia (84532)", () => {
    expect(isTestnetChainId(84532)).toBe(true);
  });

  it("recognises Arbitrum Sepolia (421614)", () => {
    expect(isTestnetChainId(421614)).toBe(true);
  });

  it("recognises OP Sepolia (11155420)", () => {
    expect(isTestnetChainId(11155420)).toBe(true);
  });

  it("recognises Ethereum Sepolia (11155111)", () => {
    expect(isTestnetChainId(11155111)).toBe(true);
  });

  it("rejects Base mainnet (8453)", () => {
    expect(isTestnetChainId(8453)).toBe(false);
  });

  it("rejects Ethereum mainnet (1)", () => {
    expect(isTestnetChainId(1)).toBe(false);
  });

  it("rejects Polygon mainnet (137)", () => {
    expect(isTestnetChainId(137)).toBe(false);
  });

  it("rejects Solana mainnet (101)", () => {
    expect(isTestnetChainId(101)).toBe(false);
  });

  it("TESTNET_CHAIN_IDS contains exactly 4 chains", () => {
    expect(TESTNET_CHAIN_IDS.size).toBe(4);
  });
});

describe("isTestnetSupportedToken", () => {
  it("accepts USDC on Base Sepolia", () => {
    expect(isTestnetSupportedToken(84532, "USDC")).toBe(true);
  });

  it("accepts USDC on Arbitrum Sepolia", () => {
    expect(isTestnetSupportedToken(421614, "USDC")).toBe(true);
  });

  it("accepts case-insensitive symbol", () => {
    expect(isTestnetSupportedToken(84532, "usdc")).toBe(true);
  });

  it("rejects rUSD on a testnet chain", () => {
    expect(isTestnetSupportedToken(84532, "rUSD")).toBe(false);
  });

  it("rejects mUSD on a testnet chain", () => {
    expect(isTestnetSupportedToken(84532, "mUSD")).toBe(false);
  });

  it("rejects dUSD on a testnet chain", () => {
    expect(isTestnetSupportedToken(421614, "dUSD")).toBe(false);
  });

  it("rejects ETH on a testnet chain", () => {
    expect(isTestnetSupportedToken(84532, "ETH")).toBe(false);
  });

  it("rejects USDC on a mainnet chain", () => {
    expect(isTestnetSupportedToken(8453, "USDC")).toBe(false);
  });

  it("rejects USDC on an unknown chain", () => {
    expect(isTestnetSupportedToken(999999, "USDC")).toBe(false);
  });
});
