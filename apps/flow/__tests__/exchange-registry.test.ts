/**
 * Exchange registry tests.
 *
 * Covers:
 * - EXCHANGES array shape + adapter contract
 * - getExchangeAdapter lookup
 * - resolveActiveExchangeKey (explicit + from social accounts)
 * - getActiveExchangeAdapter combined resolver
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Stub flow-sdk's getUserSocialAccounts before the registry module loads.
vi.mock("@/lib/dynamic/flow-sdk", () => ({
  getUserSocialAccounts: vi.fn(() => []),
  getKrakenAccounts: vi.fn(async () => []),
  getKrakenWhitelistedAddresses: vi.fn(async () => ({
    enforcesAddressWhitelist: false,
    destinations: [],
  })),
  createKrakenExchangeTransfer: vi.fn(async () => ({
    id: "txn-1",
    status: "pending",
    amount: 100,
    currency: "USDC",
  })),
}));

// Stub the KrakenLogo component (comes from @dynamic-demos/ui).
vi.mock("@dynamic-demos/ui", () => ({
  KrakenLogo: () => null,
}));

// Stub transformKrakenToTokenAssets (comes from @dynamic-demos/checkouts-widget).
vi.mock("@dynamic-demos/checkouts-widget", () => ({
  transformKrakenToTokenAssets: vi.fn(() => []),
}));

import {
  EXCHANGES,
  getExchangeAdapter,
  resolveActiveExchangeKey,
  getActiveExchangeAdapter,
  krakenAdapter,
} from "../lib/exchanges";
import { getUserSocialAccounts } from "../lib/dynamic/flow-sdk";

describe("exchange registry", () => {
  beforeEach(() => {
    vi.mocked(getUserSocialAccounts).mockReturnValue([]);
  });

  // ---------------------------------------------------------------------------
  // EXCHANGES array
  // ---------------------------------------------------------------------------

  it("EXCHANGES contains at least the Kraken adapter", () => {
    expect(EXCHANGES.length).toBeGreaterThanOrEqual(1);
    expect(EXCHANGES.find((e) => e.key === "kraken")).toBeDefined();
  });

  it("every adapter satisfies the ExchangeAdapter contract", () => {
    for (const adapter of EXCHANGES) {
      expect(adapter.key).toBeTypeOf("string");
      expect(adapter.name).toBeTypeOf("string");
      expect(adapter.socialProvider).toBeTypeOf("string");
      expect(adapter.websiteUrl).toBeTypeOf("string");
      expect(adapter.getBalances).toBeTypeOf("function");
      expect(adapter.checkWhitelisting).toBeTypeOf("function");
      expect(adapter.createTransfer).toBeTypeOf("function");
    }
  });

  // ---------------------------------------------------------------------------
  // getExchangeAdapter
  // ---------------------------------------------------------------------------

  it("getExchangeAdapter returns the adapter for a known key", () => {
    const adapter = getExchangeAdapter("kraken");
    expect(adapter).toBeDefined();
    expect(adapter!.key).toBe("kraken");
  });

  it("getExchangeAdapter returns undefined for an unknown key", () => {
    expect(getExchangeAdapter("coinbase")).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // resolveActiveExchangeKey
  // ---------------------------------------------------------------------------

  it("resolveActiveExchangeKey returns the explicit key if provided", () => {
    expect(resolveActiveExchangeKey("kraken")).toBe("kraken");
  });

  it("resolveActiveExchangeKey returns null with no social accounts and no explicit key", () => {
    expect(resolveActiveExchangeKey()).toBeNull();
    expect(resolveActiveExchangeKey(null)).toBeNull();
  });

  it("resolveActiveExchangeKey auto-detects from social accounts", () => {
    vi.mocked(getUserSocialAccounts).mockReturnValue([
      {
        provider: "kraken",
        emails: [],
        photos: [],
        verifiedCredentialId: "vc-1",
      },
    ]);
    expect(resolveActiveExchangeKey()).toBe("kraken");
  });

  it("resolveActiveExchangeKey ignores unrelated social providers", () => {
    vi.mocked(getUserSocialAccounts).mockReturnValue([
      {
        provider: "google",
        emails: [],
        photos: [],
        verifiedCredentialId: "vc-2",
      },
    ]);
    expect(resolveActiveExchangeKey()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // getActiveExchangeAdapter
  // ---------------------------------------------------------------------------

  it("getActiveExchangeAdapter returns adapter + key for known key", () => {
    const result = getActiveExchangeAdapter("kraken");
    expect(result).not.toBeNull();
    expect(result!.key).toBe("kraken");
    expect(result!.adapter.key).toBe("kraken");
  });

  it("getActiveExchangeAdapter returns null for unknown key", () => {
    expect(getActiveExchangeAdapter("coinbase")).toBeNull();
  });

  it("getActiveExchangeAdapter returns null with no social accounts", () => {
    expect(getActiveExchangeAdapter()).toBeNull();
  });

  it("getActiveExchangeAdapter auto-detects via social accounts", () => {
    vi.mocked(getUserSocialAccounts).mockReturnValue([
      {
        provider: "kraken",
        emails: [],
        photos: [],
        verifiedCredentialId: "vc-3",
      },
    ]);
    const result = getActiveExchangeAdapter();
    expect(result).not.toBeNull();
    expect(result!.key).toBe("kraken");
  });

  // ---------------------------------------------------------------------------
  // krakenAdapter identity
  // ---------------------------------------------------------------------------

  it("krakenAdapter has correct identity fields", () => {
    expect(krakenAdapter.key).toBe("kraken");
    expect(krakenAdapter.name).toBe("Kraken Exchange");
    expect(krakenAdapter.socialProvider).toBe("kraken");
    expect(krakenAdapter.websiteUrl).toBe("https://www.kraken.com");
  });
});
