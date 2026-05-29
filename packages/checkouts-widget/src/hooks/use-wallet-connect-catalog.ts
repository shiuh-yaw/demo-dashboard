"use client";

/**
 * Lazy WalletConnect-catalog fetcher.
 *
 * Returns the raw catalog plus loading/error. Consumers do their own
 * filtering/grouping/sort downstream via `buildCatalogGroups`
 * (lib/wallet-catalog.ts) so the hook stays unopinionated.
 *
 * The fetch is deduped at the module level — every mount that asks for
 * the catalog while it's in-flight receives the same promise, and
 * successful results are cached for the lifetime of the page. That
 * mirrors the SDK reference app's `useQuery({ queryKey:
 * ['walletConnectCatalog'] })` pattern (apps/react-demo/src/app/
 * components/walletConnect/WalletConnectWalletList.tsx) without
 * forcing `@tanstack/react-query` to become a widget peer.
 *
 * A side benefit of the module cache: Strict Mode's
 * mount/unmount/re-mount cycle becomes a no-op for the second mount —
 * it reads from the same promise instead of starting a fresh fetch
 * that the first mount's cleanup would discard. No "don't gate on
 * loading" workaround needed.
 */

import { useEffect, useState } from "react";
import {
  getWalletConnectCatalog,
  type WalletConnectCatalog,
} from "@dynamic-labs-sdk/client";

// Module-scoped promise cache. The catalog is global (no per-user
// state), so a singleton fetch is appropriate. Failures clear the
// cache so the next caller retries cleanly rather than reusing a
// rejected promise forever.
let cachedCatalogPromise: Promise<WalletConnectCatalog | null> | null = null;

function fetchCatalogOnce(): Promise<WalletConnectCatalog | null> {
  if (!cachedCatalogPromise) {
    cachedCatalogPromise = getWalletConnectCatalog().catch((err: unknown) => {
      cachedCatalogPromise = null;
      throw err;
    });
  }
  return cachedCatalogPromise;
}

export interface UseWalletConnectCatalogOptions {
  /** Gate the fetch — set to true when the host UI reveals the list. */
  enabled: boolean;
}

export interface UseWalletConnectCatalogReturn {
  /** Raw catalog payload, or null until first fetch resolves. */
  catalog: WalletConnectCatalog | null;
  /** True while the first request is in-flight. */
  loading: boolean;
  /** Non-null if the fetch threw. */
  error: string | null;
}

export function useWalletConnectCatalog({
  enabled,
}: UseWalletConnectCatalogOptions): UseWalletConnectCatalogReturn {
  const [catalog, setCatalog] = useState<WalletConnectCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || catalog) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCatalogOnce()
      .then((data) => {
        if (cancelled) return;
        setCatalog(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load wallets",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, catalog]);

  return { catalog, loading, error };
}
