/**
 * Display amounts to base units and back.
 *
 * A cap is stored in the asset's smallest unit - 100 USDC is `100000000` - so
 * every number the user types crosses this boundary. `viem` does the maths in
 * bigints; nothing here goes through `Number`, where 1 ETH in wei has already
 * lost precision.
 */

import { formatUnits, parseUnits } from "viem";

/** Null when the text isn't a number this asset can hold. */
export function toBaseUnits(display: string, decimals: number): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  try {
    const base = parseUnits(trimmed, decimals);
    return base > 0n ? base.toString() : null;
  } catch {
    return null;
  }
}

/** Base units as a plain decimal string, trailing zeros dropped. */
export function toDisplayUnits(base: string, decimals: number): string {
  try {
    return formatUnits(BigInt(base), decimals);
  } catch {
    return base;
  }
}

/**
 * Digits with at most one point, and no more decimal places than the asset
 * has. Rejecting a keystroke leaves the field as it was, so a paste of
 * something unusable can't silently become a different number.
 */
export function isTypableAmount(value: string, decimals: number): boolean {
  if (value === "") return true;
  if (!/^\d*\.?\d*$/.test(value)) return false;
  const [, fraction = ""] = value.split(".");
  return fraction.length <= decimals;
}
