"use client";

/**
 * The "how much, of what" pair behind every cap field.
 *
 * One hook rather than two pieces of screen state because the two are coupled:
 * the asset decides how many decimal places the amount may have, and how the
 * typed number converts to the base units the rule stores. The conversion
 * itself lives in `lib/cap-value.ts`, which is pure and tested.
 */

import { useEffect, useRef, useState } from "react";
import { isTypableAmount, toDisplayUnits } from "@/lib/amounts";
import { DEFAULT_TOKEN_DECIMALS, findCapAsset, type CapAsset } from "@/lib/cap-assets";
import {
  CUSTOM_ASSET_KEY,
  NATIVE_ASSET_KEY,
  assetKeyOf,
  capFromDraft,
  decimalsForDraft,
} from "@/lib/cap-value";
import type { PolicyCap } from "@/lib/dynamic/policies";

export { CUSTOM_ASSET_KEY, NATIVE_ASSET_KEY };

export interface CapAmount {
  assetKey: string;
  setAssetKey: (key: string) => void;
  amount: string;
  /** Ignores anything the asset can't hold, leaving the field as it was. */
  setAmount: (next: string) => void;
  customAddress: string;
  setCustomAddress: (next: string) => void;
  customDecimals: string;
  setCustomDecimals: (next: string) => void;
  isCustom: boolean;
  decimals: number;
  /** Unit label for the amount, e.g. `USDC`. */
  symbol: string;
  /** Null means no cap. Check `error` first. */
  cap: PolicyCap | null;
  /** Why `cap` can't be built from what's on screen, when it can't. */
  error: string | null;
}

export function useCapAmount({
  assets,
  cap,
  limitFor,
}: {
  assets: readonly CapAsset[];
  /** The stored cap to seed from, once it has been read. */
  cap?: PolicyCap;
  /**
   * The stored limit for an asset, when the field edits a LIST of them: picking
   * an asset then shows what it is already capped at instead of an empty box.
   */
  limitFor?: (assetKey: string) => PolicyCap | undefined;
}): CapAmount {
  const [assetKey, setAssetKey] = useState(NATIVE_ASSET_KEY);
  const [amount, setAmountRaw] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customDecimals, setCustomDecimals] = useState(
    String(DEFAULT_TOKEN_DECIMALS),
  );

  /**
   * The cap already seeded from. Without it, any later render that changes
   * `assets` would re-run the seed and overwrite what the user is typing.
   */
  const seeded = useRef<PolicyCap | undefined>(undefined);

  // Seeded from the stored cap once it arrives rather than in a `useState`
  // initializer: the first render happens before the read resolves.
  useEffect(() => {
    if (!cap || seeded.current === cap) return;
    seeded.current = cap;
    const listed = findCapAsset(assets, cap.asset);
    if (listed) {
      setAssetKey(assetKeyOf(listed));
      setAmountRaw(toDisplayUnits(cap.amount, listed.decimals));
      return;
    }
    // An asset this build doesn't know: show it as a custom token. Its decimals
    // aren't discoverable from the rule, so the amount is read back with the
    // ERC-20 default and the field says which decimals it used.
    setAssetKey(CUSTOM_ASSET_KEY);
    setCustomAddress(cap.asset ?? "");
    setAmountRaw(toDisplayUnits(cap.amount, DEFAULT_TOKEN_DECIMALS));
  }, [cap, assets]);

  const existing = limitFor?.(assetKey);

  /**
   * What the amount box was last filled from, so it re-seeds when the asset
   * changes or that asset's stored limit does - and at no other time, or it
   * would overwrite what the user is typing.
   */
  const filledFrom = useRef<{ key: string; cap?: PolicyCap } | null>(null);

  useEffect(() => {
    if (!limitFor) return;
    if (
      filledFrom.current?.key === assetKey &&
      filledFrom.current?.cap === existing
    ) {
      return;
    }
    filledFrom.current = { key: assetKey, cap: existing };
    const listed = findCapAsset(assets, existing?.asset);
    setAmountRaw(
      existing
        ? toDisplayUnits(existing.amount, listed?.decimals ?? DEFAULT_TOKEN_DECIMALS)
        : "",
    );
  }, [assetKey, existing, assets, limitFor]);

  const draft = { assetKey, amount, customAddress, customDecimals };
  const decimals = decimalsForDraft(assets, draft);
  const { cap: capValue, error } = capFromDraft(assets, draft);

  const isCustom = assetKey === CUSTOM_ASSET_KEY;
  const selected = assets.find((asset) => assetKeyOf(asset) === assetKey);

  return {
    assetKey,
    setAssetKey,
    amount,
    setAmount: (next: string) => {
      if (isTypableAmount(next, decimals)) setAmountRaw(next);
    },
    customAddress,
    setCustomAddress,
    customDecimals,
    setCustomDecimals,
    isCustom,
    decimals,
    symbol: isCustom ? "this token" : (selected?.symbol ?? ""),
    cap: capValue,
    error,
  };
}
