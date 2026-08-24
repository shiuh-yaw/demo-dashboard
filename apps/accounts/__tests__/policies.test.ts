import { describe, expect, it } from "vitest";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import type { WaasPolicyLayerResponse } from "@dynamic-labs-sdk/client/waas";
import {
  buildAssetLimitRule,
  buildDestinationRule,
  toPolicyChain,
  toScope,
  viewOfLayer,
} from "../lib/dynamic/policies";

/**
 * One cast, here: `WaasPolicyRuleType` is not re-exported from the SDK's waas
 * entrypoint, so a rule literal cannot be given its enum type.
 */
const layerOf = (rules: unknown[]): WaasPolicyLayerResponse =>
  ({
    layerId: "layer-1",
    layerContent: { rules },
    updatedAt: new Date("2026-08-20T00:00:00Z"),
  }) as unknown as WaasPolicyLayerResponse;

const allow = (over: Record<string, unknown> = {}) => ({
  ruleId: "r-allow",
  name: "Allow 0xaaa",
  ruleType: "allow",
  chain: "EVM",
  chainIds: [84532],
  addresses: ["0xaaa"],
  ...over,
});

const deny = (over: Record<string, unknown> = {}) => ({
  ruleId: "r-deny",
  name: "Deny 0xbbb",
  ruleType: "deny",
  chain: "EVM",
  chainIds: [84532],
  addresses: ["0xbbb"],
  ...over,
});

describe("viewOfLayer", () => {
  it("reads an allow rule as an approved address and nothing more", () => {
    // Even one carrying a value limit from an earlier build: an amount is a
    // transaction limit, which is a rule of its own.
    const view = viewOfLayer(
      layerOf([allow({ valueLimit: { maxPerCall: "100000000", asset: "0xusdc" } })]),
      "EVM",
      [84532],
    );

    expect(view.destinations).toEqual([
      { ruleId: "r-allow", address: "0xaaa", mode: "allow" },
    ]);
    expect(view.assetLimits).toEqual([]);
    expect(view.otherRuleCount).toBe(0);
  });

  it("reads a deny rule as a blocked destination and never a capped one", () => {
    const view = viewOfLayer(
      layerOf([deny({ valueLimit: { maxPerCall: "5" } })]),
      "EVM",
      [84532],
    );
    expect(view.destinations).toEqual([
      { ruleId: "r-deny", address: "0xbbb", mode: "deny" },
    ]);
  });

  it("reads an addressless value limit as an amount limit", () => {
    const view = viewOfLayer(
      layerOf([
        deny({
          ruleId: "r-cap",
          addresses: undefined,
          valueLimit: { maxPerCall: "500000000000000000" },
        }),
      ]),
      "EVM",
      [84532],
    );
    expect(view.assetLimits).toEqual([
      { ruleId: "r-cap", cap: { amount: "500000000000000000" } },
    ]);
    expect(view.destinations).toHaveLength(0);
  });

  it("keeps one limit per asset rather than collapsing them", () => {
    const view = viewOfLayer(
      layerOf([
        deny({
          ruleId: "r-native",
          addresses: undefined,
          valueLimit: { maxPerCall: "10000000000000000000" },
        }),
        deny({
          ruleId: "r-usdc",
          addresses: undefined,
          valueLimit: { maxPerCall: "500000000", asset: "0xusdc" },
        }),
      ]),
      "EVM",
      [84532],
    );

    expect(view.assetLimits).toEqual([
      { ruleId: "r-native", cap: { amount: "10000000000000000000" } },
      { ruleId: "r-usdc", cap: { amount: "500000000", asset: "0xusdc" } },
    ]);
    // Neither is "other" - both are limits the screen edits.
    expect(view.otherRuleCount).toBe(0);
  });

  it("splits a multi-address rule into one row per address", () => {
    const view = viewOfLayer(
      layerOf([allow({ addresses: ["0xaaa", "0xccc"] })]),
      "EVM",
      [84532],
    );
    expect(view.destinations.map((rule) => rule.address)).toEqual([
      "0xaaa",
      "0xccc",
    ]);
    // Same rule, so editing either rewrites both.
    expect(new Set(view.destinations.map((rule) => rule.ruleId)).size).toBe(1);
  });

  it("accepts the singular legacy address field", () => {
    const view = viewOfLayer(
      layerOf([allow({ addresses: undefined, address: "0xlegacy" })]),
      "EVM",
      [84532],
    );
    expect(view.destinations[0]?.address).toBe("0xlegacy");
  });

  it("counts operation restrictions without showing them as destinations", () => {
    const view = viewOfLayer(
      layerOf([
        deny({
          ruleId: "r-export",
          addresses: undefined,
          operationRestrictions: { blockExport: true },
        }),
      ]),
      "EVM",
      [84532],
    );
    expect(view.destinations).toHaveLength(0);
    expect(view.assetLimits).toEqual([]);
    expect(view.otherRuleCount).toBe(1);
  });

  it("skips deletion markers", () => {
    const view = viewOfLayer(
      layerOf([
        { ruleId: "r-gone", deletedById: "u1", deletedByType: "user" },
        allow(),
      ]),
      "EVM",
      [84532],
    );
    expect(view.destinations).toHaveLength(1);
    expect(view.otherRuleCount).toBe(0);
  });

  it("ignores rules for another chain or another network", () => {
    const view = viewOfLayer(
      layerOf([
        allow({ ruleId: "r-sol", chain: "SOL" }),
        allow({ ruleId: "r-mainnet", chainIds: [1] }),
      ]),
      "EVM",
      [84532],
    );
    expect(view.destinations).toHaveLength(0);
  });

  it("treats a rule with no chain ids as applying to every network of its chain", () => {
    const view = viewOfLayer(
      layerOf([allow({ chainIds: undefined })]),
      "EVM",
      [84532],
    );
    expect(view.destinations).toHaveLength(1);
  });

  it("keeps the layer's timestamp", () => {
    expect(viewOfLayer(layerOf([]), "EVM", [84532]).updatedAt).toEqual(
      new Date("2026-08-20T00:00:00Z"),
    );
  });
});

describe("buildDestinationRule", () => {
  it("writes one address per rule and never a value limit", () => {
    const rule = buildDestinationRule({
      rule: { address: "0xaaa", mode: "allow" },
      chain: "EVM",
      chainIds: [84532],
    });

    expect(rule.addresses).toEqual(["0xaaa"]);
    expect(rule.valueLimit).toBeUndefined();
    expect(String(rule.ruleType)).toBe("allow");
    expect(rule.ruleId).toBeUndefined();
  });

  it("carries an existing rule id so a save updates in place", () => {
    const rule = buildDestinationRule({
      rule: { ruleId: "r-1", address: "0xaaa", mode: "allow" },
      chain: "EVM",
      chainIds: [84532],
    });
    expect(rule.ruleId).toBe("r-1");
    expect(rule.valueLimit).toBeUndefined();
  });

  it("builds a deny with no value limit", () => {
    const rule = buildDestinationRule({
      rule: { address: "0xbbb", mode: "deny" },
      chain: "EVM",
      chainIds: [84532],
    });
    expect(String(rule.ruleType)).toBe("deny");
    expect(rule.valueLimit).toBeUndefined();
  });
});

describe("buildAssetLimitRule", () => {
  it("is a deny with a value limit and no addresses", () => {
    const rule = buildAssetLimitRule({
      cap: { amount: "500" },
      chain: "EVM",
      chainIds: [84532],
    });
    expect(String(rule.ruleType)).toBe("deny");
    expect(rule.addresses).toBeUndefined();
    expect(rule.valueLimit).toEqual({ maxPerCall: "500" });
  });

  it("names the rule after its asset so a layer of them stays legible", () => {
    expect(
      buildAssetLimitRule({
        cap: { amount: "500", asset: "0xusdc" },
        chain: "EVM",
        chainIds: [84532],
      }).name,
    ).toBe("Per-transaction cap (0xusdc)");
    expect(
      buildAssetLimitRule({ cap: { amount: "1" }, chain: "EVM", chainIds: [84532] })
        .name,
    ).toBe("Per-transaction cap (native)");
  });

  it("round-trips through viewOfLayer", () => {
    const built = buildAssetLimitRule({
      cap: { amount: "500", asset: "0xusdc" },
      ruleId: "r-cap",
      chain: "EVM",
      chainIds: [84532],
    });
    const view = viewOfLayer(layerOf([built]), "EVM", [84532]);
    expect(view.assetLimits).toEqual([
      { ruleId: "r-cap", cap: { amount: "500", asset: "0xusdc" } },
    ]);
  });
});

describe("a layer that has never been written", () => {
  it("reads as empty rather than as an error", () => {
    // What `readLayer` substitutes for a 404 `*_policy_layer_not_found`: a new
    // wallet has no layer until the first rule is saved.
    const view = viewOfLayer(
      {
        layerId: "",
        layerContent: { rules: [] },
        updatedAt: new Date(0),
      } as unknown as WaasPolicyLayerResponse,
      "EVM",
      [84532],
    );

    expect(view.destinations).toEqual([]);
    expect(view.assetLimits).toEqual([]);
    expect(view.otherRuleCount).toBe(0);
    // No timestamp: nothing has been written, so "last updated" would be a lie.
    expect(view.updatedAt).toBeUndefined();
  });

  it("is marked as not existing, so the screens refuse the write", () => {
    const absent = viewOfLayer(
      { layerId: "", layerContent: { rules: [] } } as unknown as WaasPolicyLayerResponse,
      "EVM",
      [84532],
      false,
    );
    expect(absent.exists).toBe(false);

    // A layer that IS there reads as existing even when it holds no rules.
    expect(viewOfLayer(layerOf([]), "EVM", [84532]).exists).toBe(true);
  });
});


describe("toScope", () => {
  // The batch helper addresses a wallet by the id underneath the account -
  // `verifiedCredentialId`, which is what the policy endpoints key on, not the
  // SDK's own `id`. Cast because a real `WalletAccount` carries far more than
  // this mapping reads.
  const walletAccount = {
    id: "sdk-id",
    verifiedCredentialId: "vc-id",
  } as unknown as WalletAccount;

  it("uses the verified credential id for a wallet, never the SDK id", () => {
    expect(toScope({ kind: "wallet", walletAccount })).toEqual({
      walletId: "vc-id",
    });
  });

  it("carries the share set for a signer", () => {
    expect(
      toScope({ kind: "signer", walletAccount, shareSetId: "share-1" }),
    ).toEqual({ walletId: "vc-id", shareSetId: "share-1" });
  });

  it("uses the account id for an account layer", () => {
    expect(toScope({ kind: "account", businessAccountId: "ba-1" })).toEqual({
      businessAccountId: "ba-1",
    });
  });
});

describe("chain vocabulary", () => {
  // A wallet is on SOL; a policy rule is scoped to SVM. Passing the wallet's
  // own spelling through made the enclave reject the rule outright.
  it("names Solana the way the policy endpoints do", () => {
    expect(toPolicyChain("SOL")).toBe("SVM");
    expect(toPolicyChain("ECLIPSE")).toBe("SVM");
  });

  it("leaves the chains both enums spell alike", () => {
    for (const chain of ["EVM", "BTC", "SUI", "TON", "TRON"]) {
      expect(toPolicyChain(chain)).toBe(chain);
    }
  });

  it("builds a Solana rule as SVM", () => {
    expect(
      buildDestinationRule({
        rule: { address: "sol-address", mode: "allow" },
        chain: "SOL",
        chainIds: [101],
      }).chain,
    ).toBe("SVM");

    expect(
      buildAssetLimitRule({
        cap: { amount: "1000000000" },
        chain: "SOL",
        chainIds: [101],
      }).chain,
    ).toBe("SVM");
  });

  it("reads a stored SVM rule back for a SOL wallet", () => {
    const view = viewOfLayer(
      layerOf([
        {
          ruleId: "r-sol",
          name: "Allow",
          ruleType: "allow",
          chain: "SVM",
          chainIds: [101],
          addresses: ["sol-address"],
        },
      ]),
      // What the screen has: the wallet's own chain.
      "SOL",
      [101],
    );
    expect(view.destinations).toHaveLength(1);
  });
});
