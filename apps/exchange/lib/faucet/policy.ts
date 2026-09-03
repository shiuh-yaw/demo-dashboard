/**
 * Faucet policy - pure, so it is unit-testable without a chain.
 *
 * The live-mode faucet pays real Sepolia USDC out of a treasury wallet the
 * operator funds by hand (see README). These rules keep a stage laptop from
 * draining it: fixed amounts, a per-request cap, and a per-address daily cap.
 */

export const DEFAULT_FAUCET_AMOUNTS = [10, 25, 50] as const;
export const DEFAULT_FAUCET_MAX_USDC = 50;
export const DEFAULT_FAUCET_DAILY_PER_ADDRESS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FaucetLimits {
  amounts: readonly number[];
  maxPerRequest: number;
  dailyPerAddress: number;
}

export type FaucetVerdict = { ok: true } | { ok: false; reason: string };

/** Sum of grants to an address in the trailing 24 hours. */
export function grantedToday(history: readonly { at: number; amount: number }[], now: number): number {
  return history.filter((g) => now - g.at < DAY_MS).reduce((s, g) => s + g.amount, 0);
}

export function checkFaucetRequest(
  params: { amount: number; history: readonly { at: number; amount: number }[]; now: number; treasuryUsdc: number },
  limits: FaucetLimits,
): FaucetVerdict {
  const { amount, history, now, treasuryUsdc } = params;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Choose an amount." };
  if (!limits.amounts.includes(amount)) return { ok: false, reason: `Amount must be one of ${limits.amounts.join(", ")} USDC.` };
  if (amount > limits.maxPerRequest) return { ok: false, reason: `The faucet pays at most ${limits.maxPerRequest} USDC per request.` };
  if (grantedToday(history, now) + amount > limits.dailyPerAddress)
    return { ok: false, reason: `Daily faucet limit reached for this address (${limits.dailyPerAddress} USDC). Try again tomorrow or fund the address directly.` };
  if (treasuryUsdc < amount) return { ok: false, reason: `The faucet treasury holds only ${treasuryUsdc.toFixed(2)} USDC. Top it up from Circle's Sepolia faucet.` };
  return { ok: true };
}
