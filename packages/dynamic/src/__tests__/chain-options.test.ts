import { describe, expect, it } from "vitest";
import { deriveChainOptions, type NetworkLike } from "../networks";

const NETWORKS: NetworkLike[] = [
  { chain: "EVM", displayName: "Ethereum", iconUrl: "eth.svg" },
  { chain: "EVM", displayName: "Base", iconUrl: "base.svg" },
  { chain: "SOL", displayName: "Solana Devnet", iconUrl: "sol.svg" },
  { chain: "BTC", displayName: "Bitcoin" },
];

describe("deriveChainOptions", () => {
  it("groups networks into one row per chain family", () => {
    expect(deriveChainOptions(NETWORKS)).toStrictEqual([
      {
        id: "EVM",
        name: "EVM",
        description: "Ethereum, Base",
        icon: "eth.svg",
      },
      {
        id: "SOL",
        name: "SOL",
        description: "Solana Devnet",
        icon: "sol.svg",
      },
      { id: "BTC", name: "BTC", description: "Bitcoin", icon: undefined },
    ]);
  });

  it("takes the icon of the family's first network", () => {
    const [evm] = deriveChainOptions(NETWORKS);
    expect(evm!.icon).toBe("eth.svg");
  });

  it("restricts to `only`, and uses its order rather than the input's", () => {
    // The point of the ordering rule: the list must not reshuffle when the
    // environment reorders its networks.
    const options = deriveChainOptions(NETWORKS, { only: ["SOL", "EVM"] });
    expect(options.map((option) => option.id)).toStrictEqual(["SOL", "EVM"]);
  });

  it("drops an allowed chain the environment does not enable", () => {
    const options = deriveChainOptions(NETWORKS, { only: ["EVM", "TON"] });
    expect(options.map((option) => option.id)).toStrictEqual(["EVM"]);
  });

  it("returns nothing for no networks", () => {
    expect(deriveChainOptions([])).toStrictEqual([]);
    expect(deriveChainOptions([], { only: ["EVM"] })).toStrictEqual([]);
  });
});
