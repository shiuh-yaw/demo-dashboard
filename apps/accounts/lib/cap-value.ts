/**
 * The four fields of a cap field, resolved into the rule's `valueLimit`.
 *
 * Pure and separate from the hook that holds the state so the conversion is
 * testable on its own - the asset silently going missing is the failure that
 * matters here, because a rule with no `asset` caps the chain's native coin
 * and nothing else.
 */

import { toBaseUnits } from "@/lib/amounts";
import {
  DEFAULT_TOKEN_DECIMALS,
  type CapAsset,
} from "@/lib/cap-assets";
import type { PolicyCap } from "@/lib/dynamic/policies";

/** The chain's own coin - the rule's `asset` is omitted for it. */
export const NATIVE_ASSET_KEY = "native";
/** Anything not on the list, entered as a contract address. */
export const CUSTOM_ASSET_KEY = "custom";

/** The select's value for an asset: its address, or `native`. */
export function assetKeyOf(asset: CapAsset): string {
  return asset.address?.toLowerCase() ?? NATIVE_ASSET_KEY;
}

export interface CapDraft {
  assetKey: string;
  amount: string;
  customAddress: string;
  customDecimals: string;
}

/** How many decimals the drafted asset uses. */
export function decimalsForDraft(
  assets: readonly CapAsset[],
  draft: CapDraft,
): number {
  if (draft.assetKey === CUSTOM_ASSET_KEY) {
    // An emptied box means "not stated", which is 18 - not zero, which
    // `Number("")` would otherwise make it.
    const stated = draft.customDecimals.trim();
    const parsed = Number(stated);
    return stated && Number.isInteger(parsed) && parsed >= 0 && parsed <= 36
      ? parsed
      : DEFAULT_TOKEN_DECIMALS;
  }
  const selected = assets.find((asset) => assetKeyOf(asset) === draft.assetKey);
  return selected?.decimals ?? DEFAULT_TOKEN_DECIMALS;
}

/**
 * `cap: null` with no error means "no cap" - an empty amount is a valid
 * answer, and the caller removes the rule rather than writing a limit of
 * nothing.
 */
export function capFromDraft(
  assets: readonly CapAsset[],
  draft: CapDraft,
): { cap: PolicyCap | null; error: string | null } {
  const amount = draft.amount.trim();
  if (!amount) return { cap: null, error: null };

  const base = toBaseUnits(amount, decimalsForDraft(assets, draft));
  if (!base) return { cap: null, error: "Enter an amount greater than zero." };

  if (draft.assetKey === CUSTOM_ASSET_KEY) {
    const address = draft.customAddress.trim();
    if (!address) {
      return { cap: null, error: "Enter the token's contract address." };
    }
    return { cap: { amount: base, asset: address }, error: null };
  }

  const selected = assets.find((asset) => assetKeyOf(asset) === draft.assetKey);
  // Native is the only asset with no address, and its rule carries no `asset`.
  return {
    cap: { amount: base, ...(selected?.address ? { asset: selected.address } : {}) },
    error: null,
  };
}
