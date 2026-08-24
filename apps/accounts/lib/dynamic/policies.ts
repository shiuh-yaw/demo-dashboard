/**
 * Policy rules for a business account, one of its wallets, or one signer.
 *
 * Three layers, all enforced in the enclave and all evaluated on every
 * transaction: the ACCOUNT layer covers every wallet the account owns, the
 * WALLET layer covers everyone who signs for one wallet, the SIGNER layer
 * covers one share set. Layers only ever tighten - a signer layer can be
 * stricter than the wallet's, never looser - which is the admin/signer split
 * made enforceable rather than merely described.
 *
 * Rule-at-a-time rather than the SDK's `PolicyRules` sugar map: the sugar
 * carries one allow-list with at most one cap merged onto it, so "0xA up to
 * 100 USDC, 0xB up to 5" is not expressible through it. `buildAllowPolicyRule`
 * + `upsert*PolicyRule` write one rule per destination, which is the shape the
 * enclave stores anyway.
 */

import type { WalletAccount } from "@dynamic-labs-sdk/client";
import {
  buildAllowPolicyRule,
  buildDenyPolicyRule,
  createPolicy,
  getAccountPolicyLayer,
  getSignerPolicyLayer,
  getWalletPolicyLayer,
  removeAccountPolicyRule,
  removeSignerPolicyRule,
  removeWalletPolicyRule,
  upsertAccountPolicyRule,
  upsertSignerPolicyRule,
  upsertWalletPolicyRule,
  type PolicyRules,
  type PolicyScope,
  type WaasPolicyLayerResponse,
  type WaasPolicyRule,
} from "@dynamic-labs-sdk/client/waas";

/** The chain vocabulary the policy endpoints speak. */
export type PolicyChain = WaasPolicyRule["chain"];

/**
 * A wallet's chain named the way the policy endpoints name it.
 *
 * Two enums describe the same chains: a wallet is on `SOL`, a rule is scoped to
 * `SVM`. Everything else this demo mints (EVM, BTC, SUI, TON) is spelled the
 * same in both, so the map holds only what actually differs - and passing the
 * wallet's own spelling through is what made a Solana rule 400 with "must be
 * equal to one of the allowed values".
 */
const POLICY_CHAIN: Record<string, string> = {
  SOL: "SVM",
  ECLIPSE: "SVM",
};

export function toPolicyChain(chain: string): PolicyChain {
  return (POLICY_CHAIN[chain] ?? chain) as PolicyChain;
}

/** A rule as a layer returns it: `ruleId` assigned, unlike on the way in. */
type LayerRule = NonNullable<
  WaasPolicyLayerResponse["layerContent"]["rules"]
>[number];

/** Which layer an operation targets. */
export type PolicyTarget =
  /** Every wallet the account owns. Owner and admin only. */
  | { kind: "account"; businessAccountId: string }
  /** Everyone who signs for one wallet. */
  | { kind: "wallet"; walletAccount: WalletAccount }
  /** One share set. Omit `shareSetId` for the caller's own. */
  | { kind: "signer"; walletAccount: WalletAccount; shareSetId?: string };

/** How much may move in one transaction, in the asset's smallest unit. */
export interface PolicyCap {
  amount: string;
  /** Token contract address. Omitted caps the chain's native coin. */
  asset?: string;
}

/**
 * One destination, and whether value may reach it.
 *
 * Address and decision only: an amount is a TRANSACTION LIMIT, which binds one
 * asset across the whole layer rather than one address. Carrying a cap here too
 * would give the same idea two homes that could disagree.
 */
export interface DestinationRule {
  /** Absent until the enclave mints one. */
  ruleId?: string;
  address: string;
  mode: "allow" | "deny";
}

/** A per-transaction ceiling on one asset, wherever value is going. */
export interface AssetLimit {
  ruleId: string;
  cap: PolicyCap;
}

export interface PolicyLayerView {
  destinations: DestinationRule[];
  /**
   * One entry per asset. A rule's `valueLimit` binds a single asset, so "10
   * ETH and 500 USDC" is two rules - which is why this is a list and not one
   * cap with an asset picker.
   */
  assetLimits: AssetLimit[];
  /**
   * Rules this screen doesn't model (key-export blocks, contract constraints).
   * Counted, not edited, so the UI can say they exist instead of implying a
   * layer holds only what it shows.
   */
  otherRuleCount: number;
  /**
   * False when the enclave has no layer for this target. Nothing in the SDK or
   * the REST surface creates one - `get*PolicyLayer` reads, `update*` patches,
   * and there is no `create` - so a wallet minted before policies were enabled
   * on the environment can never be given rules. The screens say so instead of
   * offering a save that 404s.
   */
  exists: boolean;
  updatedAt?: Date;
}

/**
 * `WaasPolicyRuleType` isn't re-exported from the SDK's `waas` entrypoint, so
 * the stored value is compared as the string it serializes to.
 */
function isDeny(rule: LayerRule): boolean {
  return String(rule.ruleType) === "deny";
}

/**
 * A deletion marker - the enclave's stand-in for a rule it removed but
 * couldn't drop outright. Reads type every entry as a live rule, so it has to
 * be recognized structurally.
 */
function isDeletionMarker(rule: LayerRule): boolean {
  return "deletedById" in rule;
}

/** A rule's addresses, tolerating the singular legacy field. */
function addressesOf(rule: LayerRule): string[] {
  if (rule.addresses?.length) return rule.addresses;
  return rule.address ? [rule.address] : [];
}

/**
 * Whether a stored rule applies to the network on screen.
 *
 * A layer holds rules for every chain the wallet touches, and a rule with no
 * `chainIds` is the wildcard for its chain - so it counts on every network of
 * that chain, not none.
 */
function appliesTo(rule: LayerRule, chain: string, chainIds: number[]): boolean {
  if (String(rule.chain) !== String(toPolicyChain(chain))) return false;
  const ids = rule.chainIds?.length
    ? rule.chainIds
    : rule.chainId != null
      ? [rule.chainId]
      : [];
  if (ids.length === 0) return true;
  return chainIds.some((id) => ids.includes(id));
}

function capOf(rule: LayerRule): PolicyCap | undefined {
  const amount = rule.valueLimit?.maxPerCall;
  if (amount == null) return undefined;
  return { amount, ...(rule.valueLimit?.asset ? { asset: rule.valueLimit.asset } : {}) };
}

/** Splits a raw layer into the two things the screens edit, plus a count. */
export function viewOfLayer(
  layer: WaasPolicyLayerResponse,
  chain: string,
  chainIds: number[],
  exists = true,
): PolicyLayerView {
  const destinations: DestinationRule[] = [];
  const assetLimits: AssetLimit[] = [];
  let otherRuleCount = 0;

  for (const rule of layer.layerContent.rules ?? []) {
    if (isDeletionMarker(rule) || !appliesTo(rule, chain, chainIds)) continue;

    // An operation restriction is a different kind of statement entirely
    // (block export, block revocation) - left alone rather than shown as a
    // destination it isn't.
    if (rule.operationRestrictions) {
      otherRuleCount += 1;
      continue;
    }

    const addresses = addressesOf(rule);
    if (addresses.length > 0) {
      // A rule may list several addresses; each becomes its own row so the
      // list reads one destination per line. They share a `ruleId`, so editing
      // one rewrites the rule for all of them - which is why every row this
      // app writes carries exactly one address.
      for (const address of addresses) {
        destinations.push({
          ruleId: rule.ruleId,
          address,
          mode: isDeny(rule) ? "deny" : "allow",
        });
      }
      continue;
    }

    const cap = capOf(rule);
    if (cap) {
      assetLimits.push({ ruleId: rule.ruleId, cap });
      continue;
    }

    otherRuleCount += 1;
  }

  return {
    destinations,
    assetLimits,
    otherRuleCount,
    exists,
    // The epoch stands for "never written" - see `emptyLayer`.
    updatedAt: layer.updatedAt?.getTime() ? layer.updatedAt : undefined,
  };
}

/**
 * A layer that has never been written does not exist yet, and the read 404s
 * (`wallet_policy_layer_not_found`, `signer_policy_layer_not_found`). That is
 * the ordinary state of every new wallet, not a failure - and it must not be
 * confused with the 404 a non-member gets, which is a real refusal. Recognized
 * by code so no other not-found is swallowed.
 */
function isMissingLayer(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.endsWith("policy_layer_not_found");
}

/** The stand-in for a layer the enclave has not created yet. */
function emptyLayer(): WaasPolicyLayerResponse {
  return {
    layerId: "",
    layerContent: { rules: [] },
    updatedAt: new Date(0),
  } as WaasPolicyLayerResponse;
}

async function readLayer(
  target: PolicyTarget,
): Promise<{ layer: WaasPolicyLayerResponse; exists: boolean }> {
  try {
    if (target.kind === "account") {
      return {
        layer: await getAccountPolicyLayer({
          businessAccountId: target.businessAccountId,
        }),
        exists: true,
      };
    }
    if (target.kind === "wallet") {
      return {
        layer: await getWalletPolicyLayer({
          walletAccount: target.walletAccount,
        }),
        exists: true,
      };
    }
    return {
      layer: await getSignerPolicyLayer({
        walletAccount: target.walletAccount,
        shareSetId: target.shareSetId,
      }),
      exists: true,
    };
  } catch (error) {
    if (isMissingLayer(error)) return { layer: emptyLayer(), exists: false };
    throw error;
  }
}

/**
 * The same target in the scope form `createPolicy` takes.
 *
 * The rule-level helpers address a wallet by `WalletAccount`; the batch helper
 * addresses it by the id underneath, which is the wallet's
 * `verifiedCredentialId` - not the SDK's own `id`.
 */
export function toScope(target: PolicyTarget): PolicyScope {
  if (target.kind === "account") {
    return { businessAccountId: target.businessAccountId };
  }
  const walletId = target.walletAccount.verifiedCredentialId ?? "";
  if (target.kind === "wallet") return { walletId };
  return { walletId, shareSetId: target.shareSetId };
}

/**
 * Writes the same intent through `createPolicy`, which sends one BATCH
 * operation instead of a single `upsert`.
 *
 * Why both exist: the single-rule endpoint answers
 * `wallet_policy_layer_not_found` on layers the batch endpoint writes to
 * happily, so the batch call is the fallback whenever an upsert reports a
 * missing layer. It is second rather than first because the sugar map it takes
 * can only carry one allow-list and one cap - enough to seed a layer, not
 * enough to express per-address or per-asset rules, which is why they are
 * written a rule at a time in the first place.
 */
async function writeAsBatch({
  target,
  rules,
  chain,
  chainIds,
}: {
  target: PolicyTarget;
  rules: PolicyRules;
  chain: string;
  chainIds: number[];
}): Promise<WaasPolicyLayerResponse> {
  return createPolicy({
    scope: toScope(target),
    chain: toPolicyChain(chain),
    chainIds,
    rules,
  });
}

async function upsertRule(
  target: PolicyTarget,
  rule: WaasPolicyRule,
): Promise<WaasPolicyLayerResponse> {
  if (target.kind === "account") {
    return upsertAccountPolicyRule({
      businessAccountId: target.businessAccountId,
      rule,
    });
  }
  if (target.kind === "wallet") {
    return upsertWalletPolicyRule({ rule, walletAccount: target.walletAccount });
  }
  return upsertSignerPolicyRule({
    rule,
    walletAccount: target.walletAccount,
    shareSetId: target.shareSetId,
  });
}

/** Reads a layer as the screens model it. */
export async function getPolicyLayer({
  target,
  chain,
  chainIds,
}: {
  target: PolicyTarget;
  chain: string;
  chainIds: number[];
}): Promise<PolicyLayerView> {
  const { layer, exists } = await readLayer(target);
  return viewOfLayer(layer, chain, chainIds, exists);
}

/**
 * The rule a destination row writes. One address per rule, deliberately, and
 * never a `valueLimit` - saving an address rule that carried one from an
 * earlier build clears it, which is the point: amounts belong to the
 * transaction-limit rules.
 */
export function buildDestinationRule({
  rule,
  chain,
  chainIds,
}: {
  rule: DestinationRule;
  chain: string;
  chainIds: number[];
}): WaasPolicyRule {
  const shared = {
    ...(rule.ruleId ? { ruleId: rule.ruleId } : {}),
    addresses: [rule.address],
    chain: toPolicyChain(chain),
    chainIds,
  };

  if (rule.mode === "deny") {
    return buildDenyPolicyRule({ ...shared, name: `Deny ${rule.address}` });
  }

  return buildAllowPolicyRule({ ...shared, name: `Allow ${rule.address}` });
}

/** Creates or updates one destination rule. */
export async function saveDestinationRule({
  target,
  rule,
  chain,
  chainIds,
}: {
  target: PolicyTarget;
  rule: DestinationRule;
  chain: string;
  chainIds: number[];
}): Promise<PolicyLayerView> {
  let layer: WaasPolicyLayerResponse;
  try {
    layer = await upsertRule(
      target,
      buildDestinationRule({ rule, chain, chainIds }),
    );
  } catch (error) {
    if (!isMissingLayer(error)) throw error;
    layer = await writeAsBatch({
      target,
      chain,
      chainIds,
      rules:
        rule.mode === "deny"
          ? { denyAddresses: [rule.address] }
          : { allowAddresses: [rule.address] },
    });
  }
  return viewOfLayer(layer, chain, chainIds);
}

/**
 * An asset's limit: a deny rule with a value limit and no addresses, which is
 * how the enclave spells "nothing over this much of this asset, wherever it is
 * going". One rule per asset - the rule carries a single `valueLimit`, so a
 * second asset is a second rule rather than a second field.
 */
export function buildAssetLimitRule({
  cap,
  ruleId,
  chain,
  chainIds,
}: {
  cap: PolicyCap;
  ruleId?: string;
  chain: string;
  chainIds: number[];
}): WaasPolicyRule {
  return buildDenyPolicyRule({
    ...(ruleId ? { ruleId } : {}),
    // Named per asset so the layer is legible in Dynamic's dashboard, where
    // several of these sit side by side.
    name: cap.asset
      ? `Per-transaction cap (${cap.asset})`
      : "Per-transaction cap (native)",
    chain: toPolicyChain(chain),
    chainIds,
    valueLimit: {
      maxPerCall: cap.amount,
      ...(cap.asset ? { asset: cap.asset } : {}),
    },
  });
}

export async function saveAssetLimit({
  target,
  cap,
  ruleId,
  chain,
  chainIds,
}: {
  target: PolicyTarget;
  cap: PolicyCap;
  /** The existing rule for this asset, when it already has one. */
  ruleId?: string;
  chain: string;
  chainIds: number[];
}): Promise<PolicyLayerView> {
  let layer: WaasPolicyLayerResponse;
  try {
    layer = await upsertRule(
      target,
      buildAssetLimitRule({ cap, ruleId, chain, chainIds }),
    );
  } catch (error) {
    if (!isMissingLayer(error)) throw error;
    layer = await writeAsBatch({
      target,
      chain,
      chainIds,
      rules: { maxAmountPerTransaction: cap },
    });
  }
  return viewOfLayer(layer, chain, chainIds);
}

/** Drops one rule by id - how both a destination and the cap are cleared. */
export async function removePolicyRule({
  target,
  ruleId,
  chain,
  chainIds,
}: {
  target: PolicyTarget;
  ruleId: string;
  chain: string;
  chainIds: number[];
}): Promise<PolicyLayerView> {
  const layer =
    target.kind === "account"
      ? await removeAccountPolicyRule({
          businessAccountId: target.businessAccountId,
          ruleId,
        })
      : target.kind === "wallet"
        ? await removeWalletPolicyRule({
            ruleId,
            walletAccount: target.walletAccount,
          })
        : await removeSignerPolicyRule({
            ruleId,
            walletAccount: target.walletAccount,
            shareSetId: target.shareSetId,
          });
  return viewOfLayer(layer, chain, chainIds);
}
