/**
 * Kraken adapter tests.
 *
 * Covers:
 * - getBalances delegates to getKrakenAccounts + transformKrakenToTokenAssets
 * - checkWhitelisting logic (enforced + not enforced, address + currency matching)
 * - createTransfer account selection + delegation to SDK
 * - Error handling in createTransfer
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetKrakenAccounts = vi.fn();
const mockGetKrakenWhitelistedAddresses = vi.fn();
const mockCreateKrakenExchangeTransfer = vi.fn();
const mockTransformKrakenToTokenAssets = vi.fn();

vi.mock("@/lib/dynamic/flow-sdk", () => ({
  getKrakenAccounts: (...args: unknown[]) => mockGetKrakenAccounts(...args),
  getKrakenWhitelistedAddresses: (...args: unknown[]) =>
    mockGetKrakenWhitelistedAddresses(...args),
  createKrakenExchangeTransfer: (...args: unknown[]) =>
    mockCreateKrakenExchangeTransfer(...args),
}));

vi.mock("@dynamic-demos/ui", () => ({
  KrakenLogo: () => null,
}));

vi.mock("@dynamic-demos/checkouts-widget", () => ({
  transformKrakenToTokenAssets: (...args: unknown[]) =>
    mockTransformKrakenToTokenAssets(...args),
}));

import { krakenAdapter } from "../lib/exchanges/kraken";

describe("krakenAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getBalances
  // ---------------------------------------------------------------------------

  describe("getBalances", () => {
    it("delegates to getKrakenAccounts + transformKrakenToTokenAssets", async () => {
      const accounts = [{ id: "acc-1", balances: [] }];
      const tokens = [{ id: "USDC-0-", symbol: "USDC" }];
      mockGetKrakenAccounts.mockResolvedValue(accounts);
      mockTransformKrakenToTokenAssets.mockReturnValue(tokens);

      const result = await krakenAdapter.getBalances();

      expect(mockGetKrakenAccounts).toHaveBeenCalledOnce();
      expect(mockTransformKrakenToTokenAssets).toHaveBeenCalledWith(accounts);
      expect(result).toEqual(tokens);
    });
  });

  // ---------------------------------------------------------------------------
  // checkWhitelisting
  // ---------------------------------------------------------------------------

  describe("checkWhitelisting", () => {
    it("returns not-required when exchange does not enforce whitelisting", async () => {
      mockGetKrakenWhitelistedAddresses.mockResolvedValue({
        enforcesAddressWhitelist: false,
        destinations: [],
      });

      const result = await krakenAdapter.checkWhitelisting("0xabc");
      expect(result).toEqual({ required: false, isWhitelisted: true });
    });

    it("returns whitelisted when address + currency match", async () => {
      mockGetKrakenWhitelistedAddresses.mockResolvedValue({
        enforcesAddressWhitelist: true,
        destinations: [{ address: "0xABC", tokens: ["USDC", "ETH"] }],
      });

      const result = await krakenAdapter.checkWhitelisting("0xabc", "USDC");
      expect(result).toEqual({ required: true, isWhitelisted: true });
    });

    it("returns not-whitelisted when address matches but currency doesn't", async () => {
      mockGetKrakenWhitelistedAddresses.mockResolvedValue({
        enforcesAddressWhitelist: true,
        destinations: [{ address: "0xABC", tokens: ["ETH"] }],
      });

      const result = await krakenAdapter.checkWhitelisting("0xabc", "USDC");
      expect(result).toEqual({ required: true, isWhitelisted: false });
    });

    it("returns not-whitelisted when address doesn't match", async () => {
      mockGetKrakenWhitelistedAddresses.mockResolvedValue({
        enforcesAddressWhitelist: true,
        destinations: [{ address: "0xDEF", tokens: ["USDC"] }],
      });

      const result = await krakenAdapter.checkWhitelisting("0xabc", "USDC");
      expect(result).toEqual({ required: true, isWhitelisted: false });
    });

    it("returns whitelisted (address only) when no currency specified", async () => {
      mockGetKrakenWhitelistedAddresses.mockResolvedValue({
        enforcesAddressWhitelist: true,
        destinations: [{ address: "0xABC", tokens: ["USDC"] }],
      });

      const result = await krakenAdapter.checkWhitelisting("0xabc");
      expect(result).toEqual({ required: true, isWhitelisted: true });
    });

    it("falls back gracefully on error", async () => {
      mockGetKrakenWhitelistedAddresses.mockRejectedValue(
        new Error("API down"),
      );

      const result = await krakenAdapter.checkWhitelisting("0xabc");
      expect(result).toEqual({ required: false, isWhitelisted: true });
    });
  });

  // ---------------------------------------------------------------------------
  // createTransfer
  // ---------------------------------------------------------------------------

  describe("createTransfer", () => {
    const transferParams = {
      to: "0xabc",
      amount: 100,
      currency: "USDC",
      chainName: "EVM",
      networkId: "8453",
      idempotencyKey: "idem-1",
    };

    it("selects the first account with sufficient balance", async () => {
      mockGetKrakenAccounts.mockResolvedValue([
        {
          id: "acc-poor",
          balances: [
            { currency: "USDC", balance: 50, availableBalance: 50 },
          ],
        },
        {
          id: "acc-rich",
          balances: [
            { currency: "USDC", balance: 200, availableBalance: 200 },
          ],
        },
      ]);
      mockCreateKrakenExchangeTransfer.mockResolvedValue({
        id: "txn-1",
        status: "pending",
        amount: 100,
        currency: "USDC",
      });

      const result = await krakenAdapter.createTransfer(transferParams);

      expect(mockCreateKrakenExchangeTransfer).toHaveBeenCalledOnce();
      const call = mockCreateKrakenExchangeTransfer.mock.calls[0]![0];
      expect(call.accountId).toBe("acc-rich");
      expect(result.transferId).toBe("txn-1");
      expect(result.amount).toBe(100);
      expect(result.currency).toBe("USDC");
    });

    it("uses availableBalance when present", async () => {
      mockGetKrakenAccounts.mockResolvedValue([
        {
          id: "acc-1",
          balances: [
            { currency: "USDC", balance: 200, availableBalance: 50 },
          ],
        },
        {
          id: "acc-2",
          balances: [
            { currency: "USDC", balance: 200, availableBalance: 150 },
          ],
        },
      ]);
      mockCreateKrakenExchangeTransfer.mockResolvedValue({
        id: "txn-2",
        status: "pending",
        amount: 100,
        currency: "USDC",
      });

      await krakenAdapter.createTransfer(transferParams);
      const call = mockCreateKrakenExchangeTransfer.mock.calls[0]![0];
      expect(call.accountId).toBe("acc-2");
    });

    it("throws when no account has sufficient balance", async () => {
      mockGetKrakenAccounts.mockResolvedValue([
        {
          id: "acc-1",
          balances: [
            { currency: "USDC", balance: 10, availableBalance: 10 },
          ],
        },
      ]);

      await expect(
        krakenAdapter.createTransfer(transferParams),
      ).rejects.toThrow("Insufficient USDC balance");
    });

    it("wraps SDK errors with readable message", async () => {
      mockGetKrakenAccounts.mockResolvedValue([
        {
          id: "acc-1",
          balances: [
            { currency: "USDC", balance: 500, availableBalance: 500 },
          ],
        },
      ]);
      mockCreateKrakenExchangeTransfer.mockRejectedValue({
        body: { error: "MFA required" },
      });

      await expect(
        krakenAdapter.createTransfer(transferParams),
      ).rejects.toThrow("MFA required");
    });
  });
});
