"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
  getEvmWalletAccount,
  getEvmWalletAccountsForAddress,
  onEvent,
  offEvent,
} from "@/lib/dynamic";
import type { NetworkData } from "@dynamic-labs-sdk/client";

/**
 * Active EVM network state for the app.
 *
 * Why a Context instead of a self-contained hook? The header switcher and
 * the wallet card both need to read AND write the active network. Two
 * independent hook instances each owning their own React state can drift
 * when one initiates a switch and the other's `walletAccountsChanged`
 * listener observes a transient mid-switch value (or fires before/after
 * the SDK has actually applied the change). Centralising state in one
 * provider eliminates that race entirely — both surfaces always render
 * the same value because they read the same atom.
 */

interface ActiveNetworkState {
  networks: NetworkData[];
  active: NetworkData | null;
  switching: boolean;
  error: string | null;
  switchTo: (networkId: string) => Promise<void>;
}

const EMPTY_STATE: ActiveNetworkState = {
  networks: [],
  active: null,
  switching: false,
  error: null,
  switchTo: async () => {},
};

const ActiveNetworkContext = createContext<ActiveNetworkState>(EMPTY_STATE);

export function useActiveNetwork(): ActiveNetworkState {
  return useContext(ActiveNetworkContext);
}

interface ActiveNetworkProviderProps {
  /**
   * Address of the wallet currently bound to the dashboard. Pass `null`
   * before sign-in / before the wallet resolves — the provider returns
   * empty state and skips SDK subscriptions in that mode.
   */
  walletAddress: string | null;
  children: ReactNode;
}

export function ActiveNetworkProvider({
  walletAddress,
  children,
}: ActiveNetworkProviderProps) {
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [active, setActive] = useState<NetworkData | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror `switching` synchronously so the refresh effect can bail out
  // of mid-switch echo events without waiting a render.
  const switchingRef = useRef(false);

  // Track first-mount fallback per wallet address so we don't repeatedly
  // force-switch back to evmNetworks[0] on every event echo.
  const initializedRef = useRef<Set<string>>(new Set());

  // Avoid churning referential identity of `active` (which is part of the
  // balance React-Query cache key) on SDK echo events whose resolved
  // networkId hasn't actually changed. Chain-keyed queries (e.g. the USDC
  // balance) re-fetch automatically when `active.networkId` changes — no
  // explicit invalidation needed because React-Query treats a new
  // queryKey as a new query.
  const setActiveIfChanged = useCallback((next: NetworkData) => {
    setActive((prev) => (prev?.networkId === next.networkId ? prev : next));
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setNetworks([]);
      setActive(null);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      const evmNetworks = getNetworksData().filter(
        (n: NetworkData) => n.chain === "EVM",
      );
      if (cancelled) return;
      setNetworks(evmNetworks);

      // While a user-initiated switch is in flight, the SDK fires several
      // `walletAccountsChanged` events as kernel accounts flip. Don't
      // race with `switchTo`, which owns the active value and will set
      // it to the resolved final state itself.
      if (switchingRef.current) return;

      const walletAccount = getEvmWalletAccount();
      if (!walletAccount) return;

      const result = await getActiveNetworkData({ walletAccount });
      if (cancelled) return;

      if (result.networkData) {
        setActiveIfChanged(result.networkData as NetworkData);
        initializedRef.current.add(walletAccount.address);
        return;
      }

      // Dynamic returns undefined when the wallet's last active network
      // isn't enabled in the project. On first mount per wallet, fall
      // back to the first enabled EVM network and proactively switch
      // the wallet onto it. After init, a transient undefined here is
      // almost always a mid-switch race — leave the user's choice alone.
      if (initializedRef.current.has(walletAccount.address)) return;

      const fallback = evmNetworks[0];
      if (!fallback) return;
      setActiveIfChanged(fallback);
      initializedRef.current.add(walletAccount.address);
      const targets = getEvmWalletAccountsForAddress(walletAccount.address);
      await Promise.all(
        targets.map((wallet) =>
          switchActiveNetwork({
            networkId: fallback.networkId,
            walletAccount: wallet,
          }).catch(() => {}),
        ),
      );
    };

    refresh().catch(() => {});

    const onAny = () => {
      refresh().catch(() => {});
    };

    onEvent({ event: "projectSettingsChanged", listener: onAny });
    onEvent({ event: "walletProviderRegistered", listener: onAny });
    onEvent({ event: "walletAccountsChanged", listener: onAny });

    return () => {
      cancelled = true;
      offEvent({ event: "projectSettingsChanged", listener: onAny });
      offEvent({ event: "walletProviderRegistered", listener: onAny });
      offEvent({ event: "walletAccountsChanged", listener: onAny });
    };
  }, [walletAddress, setActiveIfChanged]);

  const switchTo = useCallback(
    async (networkId: string) => {
      if (networkId === active?.networkId) return;
      // Idempotent: ignore concurrent click-spam during a switch.
      if (switchingRef.current) return;

      switchingRef.current = true;
      setSwitching(true);
      setError(null);

      try {
        const walletAccount = getEvmWalletAccount();
        if (!walletAccount) throw new Error("No EVM wallet");

        // Switch every wallet account that shares this address — base
        // WaaS signer + any ZeroDev kernel registered against the same
        // EOA via EIP-7702. Individual failures tolerated (e.g. ZeroDev
        // may not be configured for a chain) but at least one must
        // succeed.
        const targets = getEvmWalletAccountsForAddress(walletAccount.address);
        const results = await Promise.allSettled(
          (targets.length > 0 ? targets : [walletAccount]).map((wallet) =>
            switchActiveNetwork({ networkId, walletAccount: wallet }),
          ),
        );
        const succeeded = results.some((r) => r.status === "fulfilled");
        if (!succeeded) {
          const firstFailure = results.find(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult | undefined;
          throw firstFailure?.reason instanceof Error
            ? firstFailure.reason
            : new Error("Network switch failed");
        }

        // Optimistic local update so every subscriber renders the new
        // chain immediately, even before the SDK's getActiveNetworkData
        // catches up. This is the single point of truth — no second
        // hook instance can clobber it.
        const target = networks.find((n) => n.networkId === networkId);
        if (target) setActiveIfChanged(target);

        // Reconcile with the SDK once it has settled.
        const result = await getActiveNetworkData({ walletAccount });
        if (result.networkData) {
          setActiveIfChanged(result.networkData as NetworkData);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          msg.toLowerCase().includes("unrecognized")
            ? "Network not enabled in Dynamic dashboard"
            : msg.slice(0, 140),
        );
      } finally {
        switchingRef.current = false;
        setSwitching(false);
      }
    },
    [active?.networkId, networks, setActiveIfChanged],
  );

  const value = useMemo<ActiveNetworkState>(
    () => ({ networks, active, switching, error, switchTo }),
    [networks, active, switching, error, switchTo],
  );

  return createElement(
    ActiveNetworkContext.Provider,
    { value },
    children,
  );
}
