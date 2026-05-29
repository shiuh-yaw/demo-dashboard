/**
 * Payment display adapters
 *
 * Translates raw `CheckoutTransaction` snapshots from the Dynamic Checkout Flow
 * SDK into the display shapes consumed by `ReviewPaymentScreen` and
 * `TransactionProgressScreen` (i.e. `TokenInfo`, `ReviewQuote`, `FeeBreakdown`).
 *
 * Kept package-private (not re-exported from `index.ts`) since it's an
 * implementation detail of `<PaymentWidget />`. Host apps that need richer
 * display logic can build their own `TokenInfo` and pass screens directly.
 */
import type { CheckoutTransaction } from "../checkout-flow";
import type { ReviewQuote, Token } from "./types";
import type { TokenInfo } from "../components/token-conversion-card";
import { formatRawTokenAmount, formatUsd } from "./format";

/**
 * Best-effort conversion from a CheckoutTransaction snapshot (which carries a
 * trimmed `CheckoutTransactionQuote` from the Dynamic SDK) into the
 * `ReviewQuote` shape exposed via the `onQuoteLocked` lifecycle callback.
 *
 * Returns null when no quote is available (transaction not yet quoted).
 */
export function buildReviewQuote(
  tx: CheckoutTransaction | null,
  fromToken: Token,
  destinationToken: Token,
): ReviewQuote | null {
  if (!tx || !tx.quote) return null;
  const q = tx.quote;
  const totalFeeUsd = q.fees?.totalFeeUsd ?? "0";
  return {
    route: {
      fromAmount: q.fromAmount,
      toAmount: q.toAmount,
      fromChainId: fromToken.chainId,
      toChainId: destinationToken.chainId,
      fromToken: {
        address: fromToken.address,
        chainId: fromToken.chainId,
        symbol: fromToken.symbol,
        decimals: fromToken.decimals,
      },
      toToken: {
        address: destinationToken.address,
        chainId: destinationToken.chainId,
        symbol: destinationToken.symbol,
        decimals: destinationToken.decimals,
      },
      steps: [],
    },
    fromToken: {
      address: fromToken.address,
      chainId: fromToken.chainId,
      symbol: fromToken.symbol,
      decimals: fromToken.decimals,
      name: fromToken.name,
      logoURI: fromToken.logoURI,
    },
    toToken: {
      address: destinationToken.address,
      chainId: destinationToken.chainId,
      symbol: destinationToken.symbol,
      decimals: destinationToken.decimals,
      name: destinationToken.name,
      logoURI: destinationToken.logoURI,
    },
    fromAmount: q.fromAmount,
    toAmount: q.toAmount,
    toAmountUsd: "0",
    totalFeeUsd,
  };
}

/**
 * Format a raw token amount (smallest unit, e.g. wei) as a human-readable
 * display string for `TokenInfo.amount`. Falls back to "0" if the value is
 * missing or unparsable.
 */
export function formatTokenDisplayAmount(
  rawAmount: string | undefined,
  decimals: number,
): string {
  if (!rawAmount) return "0";
  try {
    return formatRawTokenAmount(rawAmount, decimals);
  } catch {
    return "0";
  }
}

/**
 * Assemble a `TokenInfo` for a single token-conversion card slot.
 *
 * Matches the canonical `TokenInfo` shape from
 * `components/token-conversion-card.tsx`:
 *   { name, symbol, amount, usdValue, iconUrl? }
 */
export function buildTokenInfo(
  token: Token,
  amount: string,
  usdValue: string,
): TokenInfo {
  return {
    name: token.name,
    symbol: token.symbol,
    amount,
    usdValue,
    iconUrl: token.logoURI,
    chainId: token.chainId,
  };
}

/**
 * Parse a CheckoutTransaction's totalFeeUsd to a number, defaulting to 0.
 */
export function getTotalFeeUsd(tx: CheckoutTransaction | null): number {
  if (!tx?.quote?.fees?.totalFeeUsd) return 0;
  return parseFloat(tx.quote.fees.totalFeeUsd) || 0;
}

/** Display a USD value formatted as `$X.XX`, or `$0.00` when unavailable. */
export function formatUsdSafe(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return formatUsd(0);
  return formatUsd(value);
}
