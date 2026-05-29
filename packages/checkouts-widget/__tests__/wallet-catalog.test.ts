import { describe, it, expect } from "vitest";
import {
  buildCatalogGroups,
  pickWalletForChain,
} from "@/lib/wallet-catalog";

function catalog() {
  return {
    groups: {
      "phantom-group": {
        key: "phantom-group",
        name: "Phantom",
        spriteUrl: "phantom.png",
      },
    },
    wallets: {
      "wc-alpha": {
        name: "Alpha Wallet",
        chain: "EVM" as const,
        spriteUrl: "alpha.png",
        deeplinks: {},
        downloadLinks: {},
      },
      "wc-bravo": {
        name: "Bravo Wallet",
        chain: "SOL" as const,
        spriteUrl: "bravo.png",
        deeplinks: {},
        downloadLinks: {},
      },
      "wc-phantom-evm": {
        name: "Phantom",
        chain: "EVM" as const,
        spriteUrl: "phantom.png",
        deeplinks: {},
        downloadLinks: {},
        groupId: "phantom-group",
      },
      "wc-phantom-sol": {
        name: "Phantom",
        chain: "SOL" as const,
        spriteUrl: "phantom.png",
        deeplinks: {},
        downloadLinks: {},
        groupId: "phantom-group",
      },
    },
  };
}

describe("buildCatalogGroups", () => {
  it("returns [] for a null catalog", () => {
    expect(buildCatalogGroups(null)).toEqual([]);
  });

  it("collapses per-chain wallet rows into one row per vendor", () => {
    const groups = buildCatalogGroups(catalog());
    expect(groups).toHaveLength(3);
    const phantom = groups.find((g) => g.id === "phantom-group");
    expect(phantom?.name).toBe("Phantom");
    expect(phantom?.wallets.map((w) => w.chain)).toEqual(["EVM", "SOL"]);
    expect(phantom?.spriteUrl).toBe("phantom.png");
  });

  it("alphabetizes by group name", () => {
    const names = buildCatalogGroups(catalog()).map((g) => g.name);
    expect(names).toEqual(["Alpha Wallet", "Bravo Wallet", "Phantom"]);
  });

  it("filters by `chains` allow-list", () => {
    const groups = buildCatalogGroups(catalog(), { chains: ["SOL"] });
    // Alpha is EVM-only → dropped. Phantom group keeps only its SOL
    // entry. Bravo is SOL → kept.
    expect(groups.map((g) => g.name)).toEqual(["Bravo Wallet", "Phantom"]);
    const phantom = groups.find((g) => g.name === "Phantom");
    expect(phantom?.wallets.map((w) => w.chain)).toEqual(["SOL"]);
  });

  it("matches substring queries against group AND nested wallet names", () => {
    const groups = buildCatalogGroups(catalog(), { query: "phant" });
    expect(groups.map((g) => g.id)).toEqual(["phantom-group"]);
  });

  it("falls back to the wallet's own name + sprite when no group meta", () => {
    const groups = buildCatalogGroups(catalog());
    const alpha = groups.find((g) => g.name === "Alpha Wallet");
    expect(alpha?.id).toBe("wc-alpha");
    expect(alpha?.spriteUrl).toBe("alpha.png");
  });
});

describe("pickWalletForChain", () => {
  const phantom = buildCatalogGroups(catalog()).find(
    (g) => g.name === "Phantom",
  )!;

  it("picks the preferred-chain variant when present", () => {
    expect(pickWalletForChain(phantom, "SOL").chain).toBe("SOL");
    expect(pickWalletForChain(phantom, "EVM").chain).toBe("EVM");
  });

  it("falls back to the first variant when the preferred chain is missing", () => {
    expect(pickWalletForChain(phantom, "BTC").chain).toBe(
      phantom.wallets[0]!.chain,
    );
  });
});
