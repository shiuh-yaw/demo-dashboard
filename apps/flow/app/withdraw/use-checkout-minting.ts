"use client";

/**
 * Owns the create-Checkout lifecycle that DepositSubFlow and
 * WithdrawSubFlow used to duplicate inline. Both subflows mint a
 * server-side Flow Checkout (POST /api/checkouts) once their upstream
 * inputs are locked, then mount a widget against the returned id.
 *
 * Why a hook:
 *   - Both subflows had near-identical try/setError/finally blocks
 *     with different re-entry strategies (useRef vs useState) — the
 *     ref pattern is the StrictMode-safe one, this hook standardizes
 *     on it.
 *   - The Retry button in WithdrawSubFlow used to just clear the
 *     error state and trust an effect dep-array to re-fire the mint,
 *     which is brittle (every effect cycle becomes a potential
 *     retry trigger). With the hook, `retry()` is a direct call.
 *   - In-flight promises are tokened so a `reset()` while a mint is
 *     pending can't bleed stale state into a subsequent attempt.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createDestinationCheckout } from "@/lib/checkouts-api";

export interface UseCheckoutMintingParams {
  /** Gates the auto-mint. Pass `true` once all upstream inputs are
   *  locked (destination known, amount known, etc.). When `false` the
   *  hook stays idle even if a destination address is present. */
  enabled: boolean;
  mode: "deposit" | "withdraw";
  /** When null the hook never fires — useful for callers whose
   *  destination is gated behind a form step. */
  destinationAddress: string | null;
  destinationChain: "EVM" | "SOL";
  asset: string;
  chain: string;
}

export interface UseCheckoutMintingResult {
  /** Minted Checkout id. `null` until the API call succeeds. */
  checkoutId: string | null;
  /** Most recent failure message. `null` after `retry` / `reset`. */
  error: string | null;
  /** Clear the error and re-fire the mint. */
  retry: () => void;
  /** Clear both `checkoutId` and `error`. Use when the user
   *  navigates back to a pre-mint stage. In-flight promises are
   *  tokened so a stale resolution can't repopulate state after a
   *  reset. */
  reset: () => void;
}

export function useCheckoutMinting({
  enabled,
  mode,
  destinationAddress,
  destinationChain,
  asset,
  chain,
}: UseCheckoutMintingParams): UseCheckoutMintingResult {
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-entry guard: a single in-flight mint at a time. Ref-based so
  // StrictMode's double-invoke + render-time churn can't open a race.
  const inFlightRef = useRef(false);

  // Stale-resolution guard: each mint() grabs a monotonic token, and
  // the .then/.catch only writes state if the token still matches.
  // `reset()` bumps the token to invalidate any in-flight promise.
  const tokenRef = useRef(0);

  const mint = useCallback(() => {
    if (inFlightRef.current) return;
    if (!destinationAddress) return;
    inFlightRef.current = true;
    const token = ++tokenRef.current;
    setError(null);
    createDestinationCheckout({
      mode,
      destinationAddress,
      destinationChain,
      asset,
      chain,
    })
      .then((id) => {
        if (tokenRef.current === token) setCheckoutId(id);
      })
      .catch((err) => {
        if (tokenRef.current !== token) return;
        setError(
          err instanceof Error ? err.message : "Could not create Checkout",
        );
      })
      .finally(() => {
        if (tokenRef.current === token) inFlightRef.current = false;
      });
  }, [mode, destinationAddress, destinationChain, asset, chain]);

  useEffect(() => {
    if (!enabled) return;
    if (checkoutId || error) return;
    mint();
  }, [enabled, checkoutId, error, mint]);

  const retry = useCallback(() => {
    setError(null);
    mint();
  }, [mint]);

  const reset = useCallback(() => {
    tokenRef.current++;
    inFlightRef.current = false;
    setCheckoutId(null);
    setError(null);
  }, []);

  return { checkoutId, error, retry, reset };
}
