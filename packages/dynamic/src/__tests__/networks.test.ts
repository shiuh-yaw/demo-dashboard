/**
 * Tests for createNetworkConfig.
 *
 * The factory exposes a small static map of supported chain slugs → network ids
 * with a sandbox/testnet variant. It is a convenience layer; the canonical
 * source of truth for which networks are *enabled* is the Dynamic Dashboard
 * configuration. Apps use this factory to declare expectations and to obtain
 * networkIds for off-SDK queries (e.g. balance lookups).
 */

import { describe, expect, it } from "vitest";
import { createNetworkConfig, KNOWN_NETWORK_IDS } from "../networks";

describe("createNetworkConfig", () => {
  it("returns mainnet ids when sandbox is false", () => {
    const config = createNetworkConfig({
      chains: ["ethereum", "base", "polygon"],
      sandbox: false,
    });
    const ids = config.map((c) => c.networkId);
    expect(ids).toContain(KNOWN_NETWORK_IDS.ethereum.mainnet);
    expect(ids).toContain(KNOWN_NETWORK_IDS.base.mainnet);
    expect(ids).toContain(KNOWN_NETWORK_IDS.polygon.mainnet);
  });

  it("returns testnet ids by default (sandbox-by-default)", () => {
    const config = createNetworkConfig({ chains: ["ethereum", "base"] });
    const ids = config.map((c) => c.networkId);
    expect(ids).toContain(KNOWN_NETWORK_IDS.ethereum.testnet);
    expect(ids).toContain(KNOWN_NETWORK_IDS.base.testnet);
  });

  it("includes the chain slug in each entry", () => {
    const config = createNetworkConfig({ chains: ["base"], sandbox: true });
    expect(config[0]?.chain).toBe("base");
    expect(config[0]?.sandbox).toBe(true);
  });

  it("throws on an unknown chain", () => {
    expect(() =>
      createNetworkConfig({
        chains: ["wakanda" as unknown as "ethereum"],
      }),
    ).toThrow(/unknown/i);
  });
});
