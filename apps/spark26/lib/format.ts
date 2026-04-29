export function maskConfirmation(raw: string): string {
  if (raw.length <= 4) return "••••";
  return `${raw.slice(0, 4)}${"•".repeat(Math.max(4, raw.length - 7))}${raw.slice(-3)}`;
}

export function formatUsd(amount: string | number): string {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}

// state.txHash is always the Base USDC settlement hash (set by
// confirmPaymentAction after viem verifies the transfer on Base). Source-chain
// tx hashes are never persisted to state, so we always link to Basescan.
export function explorerLink(txHash?: string): string | null {
  if (!txHash) return null;
  return `https://basescan.org/tx/${txHash}`;
}

// Mirrors MetaMask's observed token-balance formatting rules:
//   - zero / invalid → "0"
//   - abs(n) < 0.001  → up to 3 significant figures (e.g. 0.000678 ETH).
//                       Values that round to fewer displayed digits still
//                       show (toPrecision(3) + Number-normalization strips
//                       trailing zeros — so 0.0002 renders as "0.0002").
//   - abs(n) < 1000   → 3 decimal places (e.g. 14.324 USDC, 0.232 DAI)
//   - abs(n) < 1e6    → integer with locale thousand separators (e.g. 5,444)
//   - abs(n) ≥ 1e6    → 3-sig-fig abbreviated M / B (e.g. 7.88M BENTO)
export function formatTokenBalance(
  value: string | number | null | undefined,
): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  if (!Number.isFinite(n) || n === 0) return "0";

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${trim3SigFigs(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${trim3SigFigs(abs / 1_000_000)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${Math.floor(abs).toLocaleString("en-US")}`;
  }
  if (abs < 0.001) {
    // "0.000678" — toPrecision gives us 3 sig figs without scientific notation
    // for this range.
    return `${sign}${Number(abs.toPrecision(3)).toString()}`;
  }
  return `${sign}${abs.toFixed(3)}`;
}

// Helper for the M / B abbreviations: 3 significant figures, no trailing zeros
// (matches "7.88M" style, not "7.88000M").
function trim3SigFigs(n: number): string {
  const s = Number(n.toPrecision(3)).toString();
  return s;
}

// Generic currency formatter. The resolver only admits USD and EUR per
// SUPPORTED_CURRENCIES; anything else is a legacy admin-display edge case.
// Modern Intl.NumberFormat doesn't throw on arbitrary 3-letter codes — it
// prepends the code — so we gate on the supported set and fall back to a
// plain "<amount> <CODE>" string for anything unrecognized.
const SUPPORTED = new Set(["USD", "EUR"]);

export function formatCurrency(
  amount: string | number,
  currency: string,
): string {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  if (!SUPPORTED.has(currency.toUpperCase())) {
    return `${safe.toFixed(2)} ${currency}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(safe);
}
