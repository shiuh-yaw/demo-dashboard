/**
 * Checkout Simulation
 *
 * Pure functions for the simulated payment flow.
 * No SDK dependency — generates mock quotes and animates transaction progress.
 */

import type { TokenAsset } from "./balance-utils";

// =============================================================================
// TYPES
// =============================================================================

export interface SimulatedQuote {
  subtotal: number;
  networkFee: number;
  total: number;
  estimatedSeconds: number;
  tokenAmount: string;
  tokenSymbol: string;
}

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "failed";
}

// =============================================================================
// QUOTE
// =============================================================================

export function generateQuote(
  cartTotal: number,
  token: TokenAsset,
): SimulatedQuote {
  // Network fee: 0.5–1.5% of subtotal
  const feePercent = 0.005 + Math.random() * 0.01;
  const networkFee = Math.round(cartTotal * feePercent * 100) / 100;
  const total = Math.round((cartTotal + networkFee) * 100) / 100;
  const estimatedSeconds = 15 + Math.floor(Math.random() * 16); // 15–30s

  const tokenAmount =
    token.pricePerToken > 0
      ? (total / token.pricePerToken).toFixed(6)
      : total.toFixed(2);

  return {
    subtotal: cartTotal,
    networkFee,
    total,
    estimatedSeconds,
    tokenAmount,
    tokenSymbol: token.symbol,
  };
}

// =============================================================================
// STEPS
// =============================================================================

export function createTransactionSteps(walletName: string): TransactionStep[] {
  return [
    {
      id: "authorize",
      title: "Authorize payment",
      description: `Confirm in ${walletName}`,
      status: "pending",
    },
    {
      id: "process",
      title: "Processing payment",
      description: "Transaction is being confirmed",
      status: "pending",
    },
    {
      id: "complete",
      title: "Complete purchase",
      description: "Merchant receives payment",
      status: "pending",
    },
  ];
}

// =============================================================================
// SIMULATION
// =============================================================================

/**
 * Simulates transaction progress by advancing steps through
 * pending → active → completed with timed delays.
 *
 * @returns cleanup function to cancel the simulation
 */
export function simulateProgress(
  steps: TransactionStep[],
  onUpdate: (steps: TransactionStep[]) => void,
  onComplete: () => void,
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const cloneSteps = () => steps.map((s) => ({ ...s }));

  let delay = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const isLast = i === steps.length - 1;

    // Set step to active
    delay += i === 0 ? 300 : 2000;
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        step.status = "active";
        onUpdate(cloneSteps());
      }, delay),
    );

    // Set step to completed
    delay += 2000;
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        step.status = "completed";
        onUpdate(cloneSteps());
        if (isLast) onComplete();
      }, delay),
    );
  }

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}
