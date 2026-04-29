"use client";

// Compact network-picker chip used inside the PickTokenView header. Shows the
// active network's icon + name and opens a popover with icons for each enabled
// network in the project.
//
// Bi-directional sync pattern (mirrors apps/deposit/contexts/deposit-network-context.tsx):
//   - Our click → switchActiveNetwork → wallet fires walletProviderChanged → we
//     don't want to bounce that back. A `suppressNextEvent` ref (owned by the
//     parent so it can outlive this component's mount) is flipped to true
//     before the call. The listener clears it on the next event.
//   - User switching networks inside MetaMask → walletProviderChanged fires →
//     we re-read the active network and React Query refetches downstream
//     (balances, etc.).
//
// Non-EVM: this component is only rendered for EVM wallets in PickTokenView
// (see the `walletAccount.chain === "EVM"` check there). switchActiveNetwork
// is EVM-specific and Solana/Bitcoin effectively have one mainnet.
import {
  getActiveNetworkData,
  getNetworksData,
  offEvent,
  offWalletProviderEvent,
  onEvent,
  onWalletProviderEvent,
  switchActiveNetwork,
  type NetworkData,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { SparkBolt } from "@/components/ui/SparkBolt.js";

export type NetworkSelectorProps = {
  walletAccount: WalletAccount;
  suppressNextEventRef: MutableRefObject<boolean>;
  onChange?: () => void;
};

export const ACTIVE_NETWORK_QUERY_KEY = "active-network";
export const NETWORKS_QUERY_KEY = "networks-data";

export function NetworkSelector({
  walletAccount,
  suppressNextEventRef,
  onChange,
}: NetworkSelectorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const networksQuery = useQuery<NetworkData[]>({
    queryKey: [NETWORKS_QUERY_KEY],
    queryFn: () => getNetworksData(),
    staleTime: Infinity,
  });

  const activeNetworkQuery = useQuery<{ networkData: NetworkData | undefined }>(
    {
      queryKey: [ACTIVE_NETWORK_QUERY_KEY, walletAccount.id],
      queryFn: () => getActiveNetworkData({ walletAccount }),
    },
  );

  useEffect(() => {
    const invalidate = () => {
      if (suppressNextEventRef.current) {
        suppressNextEventRef.current = false;
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: [ACTIVE_NETWORK_QUERY_KEY, walletAccount.id],
      });
      onChange?.();
    };

    const clientListener = () => invalidate();
    const providerListener = () => invalidate();

    onEvent({ event: "walletProviderChanged", listener: clientListener });
    try {
      onWalletProviderEvent({
        callback: providerListener,
        event: "networkChanged",
        walletProviderKey: walletAccount.walletProviderKey,
      });
    } catch {
      // Provider may not be registered yet; skip — the client-level event
      // will still catch explicit SDK-driven changes.
    }

    return () => {
      offEvent({ event: "walletProviderChanged", listener: clientListener });
      try {
        offWalletProviderEvent({
          callback: providerListener,
          event: "networkChanged",
          walletProviderKey: walletAccount.walletProviderKey,
        });
      } catch {
        // Already torn down.
      }
    };
  }, [
    queryClient,
    walletAccount.id,
    walletAccount.walletProviderKey,
    suppressNextEventRef,
    onChange,
  ]);

  const switchMutation = useMutation({
    mutationFn: async (networkId: string) => {
      suppressNextEventRef.current = true;
      try {
        await switchActiveNetwork({ networkId, walletAccount });
      } catch (err) {
        suppressNextEventRef.current = false;
        throw err;
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [ACTIVE_NETWORK_QUERY_KEY, walletAccount.id],
      });
      onChange?.();
    },
  });

  const networks = useMemo(() => {
    const all = networksQuery.data ?? [];
    return all.filter((n) => n.chain === walletAccount.chain);
  }, [networksQuery.data, walletAccount.chain]);

  const activeNetworkData = activeNetworkQuery.data?.networkData;
  const activeNetworkId = activeNetworkData?.networkId;

  const walletOnUnsupportedChain =
    !activeNetworkQuery.isLoading &&
    networks.length > 0 &&
    activeNetworkData !== undefined &&
    !networks.some((n) => n.networkId === activeNetworkId);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (networks.length === 0) {
    return null;
  }

  const activeLabel = walletOnUnsupportedChain
    ? "Switch network"
    : activeNetworkData?.displayName ?? "Select network";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Network"
        disabled={switchMutation.isPending}
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex cursor-pointer items-center gap-2 h-10 px-3 rounded-full",
          "border transition-colors disabled:cursor-not-allowed",
          walletOnUnsupportedChain
            ? "border-[var(--color-pink)]/50 bg-[var(--color-pink)]/10 hover:bg-[var(--color-pink)]/15"
            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20",
          "disabled:opacity-60",
        ].join(" ")}
      >
        <NetworkIcon network={activeNetworkData} />
        <span className="text-sm font-semibold text-white max-w-[8rem] truncate">
          {activeLabel}
        </span>
        {switchMutation.isPending ? (
          <SparkBolt size={14} animated className="text-[var(--color-blue-100)] shrink-0" />
        ) : (
          <Chevron open={open} />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select network"
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-60 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--color-navy-900)] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          {networks.map((net) => {
            const isActive = net.networkId === activeNetworkId;
            return (
              <button
                key={net.networkId}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) switchMutation.mutate(net.networkId);
                }}
                className={[
                  "w-full cursor-pointer flex items-center gap-3 px-2.5 py-2 rounded-xl text-left",
                  "transition-colors",
                  isActive
                    ? "bg-[var(--color-blue)]/15 text-white"
                    : "hover:bg-white/5 text-[color-mix(in_srgb,var(--color-blue-100)_88%,transparent)]",
                ].join(" ")}
              >
                <NetworkIcon network={net} />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">
                  {net.displayName}
                </span>
                {isActive && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-blue)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {(walletOnUnsupportedChain || switchMutation.error) && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-60 rounded-xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-3 py-2 text-xs text-[var(--color-pink-100)]">
          {switchMutation.error
            ? `Switch failed: ${switchMutation.error.message}`
            : `On ${activeNetworkData?.displayName ?? "unsupported network"}.`}
        </div>
      )}
    </div>
  );
}

function NetworkIcon({ network }: { network: NetworkData | undefined }) {
  if (!network?.iconUrl) {
    return (
      <span
        aria-hidden
        className="h-6 w-6 rounded-full bg-white/10 border border-white/10 shrink-0"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={network.iconUrl}
      alt=""
      className="h-6 w-6 rounded-full shrink-0 bg-white/5"
    />
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={[
        "text-white/70 shrink-0 transition-transform duration-200",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Exposed for testing — returns true if the wallet's active chain is absent
 * from the enabled-networks list (filtered to the wallet's chain family). */
export function _isWalletOnUnsupportedChain(
  networks: NetworkData[],
  walletChain: string,
  activeNetwork: NetworkData | undefined,
): boolean {
  const filtered = networks.filter((n) => n.chain === walletChain);
  if (filtered.length === 0) return false;
  if (activeNetwork === undefined) return false;
  return !filtered.some((n) => n.networkId === activeNetwork.networkId);
}
