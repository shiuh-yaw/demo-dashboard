/**
 * Hook that mints a fresh testnet Checkout via `/api/checkouts` when
 * testnet mode is active.
 *
 * Returns `{ checkoutId, loading, error }`. While `loading` is true
 * the caller should show a spinner or skeleton. If `error` is set
 * (e.g. `DYNAMIC_API_TOKEN` not configured) the caller can fall back
 * to the mainnet Checkout id or show an error banner.
 *
 * Each call to this hook with `isTestnet=true` and a new `mode` value
 * mints a new Checkout. The id is cached per (mode, chain) so rapid
 * re-renders don't re-fetch.
 */

import { useEffect, useRef, useState } from "react";
import { createDestinationCheckout } from "@/lib/checkouts-api";

interface UseTestnetCheckoutOptions {
  isTestnet: boolean;
  mode: "deposit" | "payment";
  /** Settlement chain key — defaults to "arb-sepolia". */
  chain?: string;
  /** Settlement asset symbol — defaults to "USDC". */
  asset?: string;
}

interface UseTestnetCheckoutResult {
  checkoutId: string | null;
  loading: boolean;
  error: string | null;
}

export function useTestnetCheckout({
  isTestnet,
  mode,
  chain = "arb-sepolia",
  asset = "USDC",
}: UseTestnetCheckoutOptions): UseTestnetCheckoutResult {
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache key to avoid re-minting on re-renders.
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isTestnet) {
      setCheckoutId(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${mode}:${chain}:${asset}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setCheckoutId(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    createDestinationCheckout({ mode, chain, asset })
      .then((id) => {
        if (cancelled) return;
        cacheRef.current.set(cacheKey, id);
        setCheckoutId(id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to create testnet checkout";
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTestnet, mode, chain, asset]);

  return { checkoutId, loading, error };
}
