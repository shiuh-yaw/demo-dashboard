/**
 * Deterministic Brand id derivation + small hex helpers.
 *
 * Re-running the backfill must not create duplicate Brand rows for
 * the same logical brand. We derive the id from a stable subset of
 * fields — (ownerId, normalised primaryColor, normalised logoUrl) —
 * so two seeds that mean the same thing collapse onto the same id.
 */

import { createHash } from "node:crypto";

import type { BrandSeed } from "./types";

const HEX_FULL = /^#[0-9a-fA-F]{6}$/;
const HEX_SHORT = /^#[0-9a-fA-F]{3}$/;

export function isHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return HEX_FULL.test(value) || HEX_SHORT.test(value);
}

export function normaliseHex(value: string): string {
  // Cache the type guard's result before re-narrowing — otherwise TS
  // narrows `value` to `never` inside the `if (!isHexColor)` branch
  // because the guard predicate `value is string` interacts badly with
  // a `string` parameter type. Calling .toLowerCase via the local
  // variable `lower` keeps the function total.
  const lower = value.toLowerCase();
  if (!isHexColor(value)) {
    // Caller should have screened with isHexColor; this path keeps the
    // function total so tests can assert idempotency on already-normal
    // input without special-casing.
    return lower;
  }
  if (HEX_SHORT.test(value)) {
    const [, r, g, b] = lower.match(/^#(.)(.)(.)$/)!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return lower;
}

/**
 * Deterministic Brand id from (ownerId, primaryColor, logoUrl).
 *
 * The hash subspace is 24 hex chars (96 bits) — well above the
 * birthday-collision threshold for the small expected population
 * (< 10k brands across all environments). Prefix `bf_` keeps it
 * visually distinct from cuid-generated rows so future ops queries
 * can tell backfilled rows apart.
 */
export function hashBrandKey(seed: {
  ownerId: string;
  primaryColor: string;
  logoUrl?: string | null;
}): string {
  const colour = isHexColor(seed.primaryColor)
    ? normaliseHex(seed.primaryColor)
    : seed.primaryColor;
  // Treat null and undefined as the same absent value.
  const logo = seed.logoUrl ?? "";
  const payload = `${seed.ownerId}|${colour}|${logo}`;
  const digest = createHash("sha256").update(payload).digest("hex");
  return `bf_${digest.slice(0, 24)}`;
}

export type { BrandSeed };
