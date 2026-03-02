import { type TransactionStatus } from "@/lib/types/dashboard";
import type { Transaction } from "@/lib/types/dashboard";

/**
 * Get badge styling for transaction status
 */
export function getStatusBadge(status: TransactionStatus): string {
  const styles: Record<TransactionStatus, string> = {
    confirmed: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-yellow-50 text-yellow-700",
    pending: "bg-amber-50 text-amber-700",
    submitted: "bg-blue-50 text-blue-700",
    draft: "bg-slate-100 text-slate-600",
    initialized: "bg-slate-100 text-slate-600",
    expired: "bg-slate-100 text-slate-500",
    abandoned: "bg-slate-100 text-slate-500",
  };
  return styles[status];
}

/**
 * Format token amount from smallest unit to readable format
 */
export function formatAmount(
  amount: string,
  token?: Transaction["toToken"]
): string {
  try {
    const num = BigInt(amount);
    const tokenDecimals = token?.decimals ?? 18;
    const divisor = BigInt(10 ** tokenDecimals);
    const whole = num / divisor;
    const remainder = num % divisor;

    // Always show 2 decimal places
    const decimalsStr = remainder
      .toString()
      .padStart(tokenDecimals, "0")
      .slice(0, 2);
    return `${whole}.${decimalsStr}`;
  } catch {
    // Fallback to raw display if parsing fails
    return amount;
  }
}

/**
 * Calculate USD value from token amount and price
 */
export function calculateUsdValue(
  amount: string,
  priceUSD?: string,
  decimals?: number
): number | null {
  if (!priceUSD || !decimals) return null;
  try {
    const amountNum = BigInt(amount);
    const price = parseFloat(priceUSD);
    return (Number(amountNum) / Math.pow(10, decimals)) * price;
  } catch {
    return null;
  }
}
