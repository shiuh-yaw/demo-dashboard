import { describe, expect, it } from "vitest";
import { capAssetsFor, findCapAsset } from "../lib/cap-assets";

const nativeCurrency = {
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
  iconUrl: "https://example.test/eth.svg",
};

describe("capAssetsFor", () => {
  it("puts the network's own coin first and gives it no address", () => {
    const assets = capAssetsFor({ chainId: 8453, nativeCurrency });
    expect(assets[0]).toEqual({ ...nativeCurrency });
    expect(assets[0]?.address).toBeUndefined();
    expect(assets.map((asset) => asset.symbol)).toEqual(["ETH", "USDC"]);
  });

  it("offers only the native coin on a network with no known tokens", () => {
    expect(capAssetsFor({ chainId: 424242, nativeCurrency })).toHaveLength(1);
  });

  it("is empty before the network is known", () => {
    expect(capAssetsFor({ chainId: null })).toEqual([]);
  });

  it("carries each token's own decimals", () => {
    const usdc = capAssetsFor({ chainId: 1, nativeCurrency }).find(
      (asset) => asset.symbol === "USDC",
    );
    expect(usdc?.decimals).toBe(6);
  });
});

describe("findCapAsset", () => {
  const assets = capAssetsFor({ chainId: 8453, nativeCurrency });

  it("matches an address whatever its case", () => {
    expect(
      findCapAsset(assets, "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913")?.symbol,
    ).toBe("USDC");
  });

  it("reads a missing address as the native coin", () => {
    expect(findCapAsset(assets, undefined)?.symbol).toBe("ETH");
  });

  it("is undefined for a token this build doesn't know", () => {
    expect(findCapAsset(assets, "0xdeadbeef")).toBeUndefined();
  });
});
