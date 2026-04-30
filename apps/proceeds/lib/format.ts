/**
 * Shared display formatters.
 *
 * Centralizing these avoids subtle divergence between screens — e.g. one spot
 * using four decimals and another two, or different truncation lengths for
 * the same address shape.
 */

const USD_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** "$1,234.56" — no sign, never negative. Use for balances, totals. */
export function formatUsd(amount: number): string {
  return `$${Math.abs(amount).toLocaleString("en-US", USD_FORMAT)}`;
}

/** "+$1,234.56" / "-$1,234.56" — signed, for ledger deltas. */
export function formatSignedUsd(amount: number): string {
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", USD_FORMAT)}`;
}

/** Locale-aware big-integer unit count, e.g. "12,408". */
export function formatUnits(n: number): string {
  return n.toLocaleString("en-US");
}

/** 4-decimal FX rate, e.g. "1.2720". */
export function formatFxRate(rate: number): string {
  return rate.toFixed(4);
}

/** "Apr 3, 2026" from an ISO string or Date. */
export function formatDateShort(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Truncate a 40-hex-character address to the `0x1234…abcd` form used
 * throughout the wallet panel and payouts UI.
 */
export function truncateAddress(
  address: string,
  leading = 6,
  trailing = 4,
): string {
  if (address.length <= leading + trailing + 1) return address;
  return `${address.slice(0, leading)}…${address.slice(-trailing)}`;
}

/**
 * Truncate a 32-byte transaction hash more aggressively than an address so
 * it reads as a secondary identifier rather than a primary one.
 */
export function truncateHash(hash: string): string {
  return truncateAddress(hash, 10, 6);
}
