import { describe, expect, it } from "vitest";
import { capAssetsFor } from "../lib/cap-assets";
import {
  CUSTOM_ASSET_KEY,
  NATIVE_ASSET_KEY,
  capFromDraft,
  decimalsForDraft,
} from "../lib/cap-value";

const nativeCurrency = {
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
  iconUrl: "https://example.test/eth.svg",
};

// Base Sepolia, the network this demo's wallets sit on.
const assets = capAssetsFor({ chainId: 84532, nativeCurrency });
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const draft = (over: Partial<Parameters<typeof capFromDraft>[1]> = {}) => ({
  assetKey: NATIVE_ASSET_KEY,
  amount: "",
  customAddress: "",
  customDecimals: "18",
  ...over,
});

describe("capFromDraft", () => {
  it("scales a native amount by 18 and carries no asset", () => {
    expect(capFromDraft(assets, draft({ amount: "10" }))).toEqual({
      cap: { amount: "10000000000000000000" },
      error: null,
    });
  });

  it("carries the token address and its own decimals for a listed token", () => {
    expect(
      capFromDraft(
        assets,
        draft({ assetKey: USDC.toLowerCase(), amount: "10" }),
      ),
    ).toEqual({
      cap: { amount: "10000000", asset: USDC },
      error: null,
    });
  });

  it("keeps the token's checksummed address, not the lowercased select key", () => {
    const { cap } = capFromDraft(
      assets,
      draft({ assetKey: USDC.toLowerCase(), amount: "1" }),
    );
    expect(cap?.asset).toBe(USDC);
  });

  it("carries a custom token's address at its stated decimals", () => {
    expect(
      capFromDraft(
        assets,
        draft({
          assetKey: CUSTOM_ASSET_KEY,
          amount: "2.5",
          customAddress: " 0xabc ",
          customDecimals: "8",
        }),
      ),
    ).toEqual({ cap: { amount: "250000000", asset: "0xabc" }, error: null });
  });

  it("refuses a custom token with no address", () => {
    const { cap, error } = capFromDraft(
      assets,
      draft({ assetKey: CUSTOM_ASSET_KEY, amount: "1" }),
    );
    expect(cap).toBeNull();
    expect(error).toMatch(/contract address/);
  });

  it("reads an empty amount as no cap, not as an error", () => {
    expect(capFromDraft(assets, draft({ amount: "  " }))).toEqual({
      cap: null,
      error: null,
    });
  });

  it("refuses zero and nonsense", () => {
    expect(capFromDraft(assets, draft({ amount: "0" })).error).toBeTruthy();
    expect(capFromDraft(assets, draft({ amount: "abc" })).error).toBeTruthy();
  });
});

describe("decimalsForDraft", () => {
  it("takes them from the listed asset", () => {
    expect(decimalsForDraft(assets, draft())).toBe(18);
    expect(
      decimalsForDraft(assets, draft({ assetKey: USDC.toLowerCase() })),
    ).toBe(6);
  });

  it("falls back to 18 for an out-of-range custom value", () => {
    expect(
      decimalsForDraft(
        assets,
        draft({ assetKey: CUSTOM_ASSET_KEY, customDecimals: "99" }),
      ),
    ).toBe(18);
    // An emptied box is "not stated", not zero decimals.
    expect(
      decimalsForDraft(
        assets,
        draft({ assetKey: CUSTOM_ASSET_KEY, customDecimals: "" }),
      ),
    ).toBe(18);
    expect(
      decimalsForDraft(
        assets,
        draft({ assetKey: CUSTOM_ASSET_KEY, customDecimals: "0" }),
      ),
    ).toBe(0);
  });
});
