import { describe, it, expect } from "vitest";
import { groupProviders } from "@/lib/wallet-providers";

// The SDK's WalletProviderData has more fields than we touch — cast to any
// at the boundary so tests stay readable without re-declaring the SDK shape.
function provider(
  key: string,
  displayName: string,
  groupKey?: string,
  icon?: string,
): unknown {
  return {
    key,
    groupKey,
    metadata: { displayName, icon },
  };
}

describe("groupProviders", () => {
  it("collapses EVM + SOL entries of the same brand into one group", () => {
    const groups = groupProviders([
      provider("phantomevm", "Phantom"),
      provider("phantomsol", "Phantom"),
      provider("metamaskevm", "MetaMask"),
    ] as never);

    expect(groups).toHaveLength(2);
    const phantom = groups.find((g) => g.key === "phantom");
    expect(phantom).toBeDefined();
    expect(phantom?.providers).toHaveLength(2);
    const metamask = groups.find((g) => g.key === "metamask");
    expect(metamask).toBeDefined();
    expect(metamask?.providers).toHaveLength(1);
  });

  it("uses explicit groupKey when provided", () => {
    const groups = groupProviders([
      provider("custom-a", "Brand X", "brand-x"),
      provider("custom-b", "Brand X", "brand-x"),
    ] as never);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("brand-x");
    expect(groups[0]?.providers).toHaveLength(2);
  });

  it("falls back to displayName when metadata has no displayName", () => {
    // The reducer falls back to the groupKey if metadata.displayName is
    // missing — exercising that branch keeps the fallback honest.
    const stripped: unknown = { key: "barewallet", groupKey: undefined };
    const groups = groupProviders([stripped] as never);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.displayName).toBe("barewallet");
  });
});
