"use client";

/**
 * Network Switcher
 *
 * Matches wallet app pattern: filter networks by wallet chain, switch with addNetwork fallback.
 * Syncs selected network to URL (?chainId=) so Earn page and other chain-aware views re-fetch.
 * @see apps/wallet/components/wallet/network-selector.tsx
 */

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NetworkNotAddedError } from "@dynamic-labs-sdk/client";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useNetworks } from "@/hooks/use-networks";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { switchActiveNetwork, addNetwork } from "@/lib/dynamic";
import { cn } from "@dynamic-demos/utils";

const EVM_CHAINS = ["EVM", "ETH", "BASE", "MATIC", "ARB", "OP"];

/** Known EVM testnet chain IDs (Sepolia, Amoy, etc.) */
const TESTNET_CHAIN_IDS = new Set([
  11155111, 421614, 84532, 11155420, 80002, 97, 43113, 59141, 5003, 534351,
  11142220, 168587773,
]);

/** Parse Dynamic networkId (e.g. "1", "evm-1") to numeric chain ID for Morpho/APIs */
function networkIdToChainId(networkId: string): number | null {
  const match = networkId.match(/evm-(\d+)/);
  const captured = match?.[1];
  if (captured) return parseInt(captured, 10);
  const n = parseInt(networkId, 10);
  return Number.isNaN(n) ? null : n;
}

function isTestnet(networkId: string, displayName: string): boolean {
  const chainId = networkIdToChainId(networkId);
  if (chainId != null && TESTNET_CHAIN_IDS.has(chainId)) return true;
  const lower = displayName.toLowerCase();
  return /sepolia|testnet|goerli|rinkeby|amoy/.test(lower);
}

function normalizeForSwitcher(
  n: { chain?: string; networkId?: string | number; displayName?: string; name?: string; iconUrl?: string; iconUrls?: string[] },
): { chain: string; networkId: string; displayName: string; iconUrl?: string } | null {
  const networkId = n.networkId != null ? String(n.networkId) : "";
  const displayName = n.displayName ?? n.name ?? networkId;
  const iconUrl = n.iconUrl ?? (Array.isArray(n.iconUrls) ? n.iconUrls[0] : undefined);
  return { chain: n.chain ?? "", networkId, displayName, iconUrl };
}

const SHOW_TESTNETS_KEY = "trade-network-show-testnets";

export function NetworkSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestnets, setShowTestnets] = useState(false);
  useEffect(() => {
    setShowTestnets(localStorage.getItem(SHOW_TESTNETS_KEY) === "true");
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primaryWallet } = usePrimaryWallet();
  const { networks } = useNetworks();
  const { networkData, refetch: refetchNetwork } = useActiveNetwork(
    primaryWallet,
  );

  // Networks for dropdown: prefer same-chain, but show all if only 1 same-chain (so dropdown appears)
  const availableNetworks = useMemo(() => {
    if (!primaryWallet) return [];

    const connector = (primaryWallet as { connector?: { getEnabledNetworks?: () => unknown[] } }).connector;
    const connectorNetworks = (connector?.getEnabledNetworks?.() ?? []) as Array<{
      chainId?: number;
      chainName?: string;
      name?: string;
      networkId?: string;
      iconUrl?: string;
      iconUrls?: string[];
    }>;
    if (connectorNetworks.length > 0) {
      return connectorNetworks
        .map((n) => {
          const id = n.networkId ?? (n.chainId != null ? String(n.chainId) : "");
          return normalizeForSwitcher({
            chain: "EVM",
            networkId: id,
            displayName: n.chainName ?? n.name ?? id,
            iconUrl: n.iconUrl ?? n.iconUrls?.[0],
          });
        })
        .filter(Boolean) as { chain: string; networkId: string; displayName: string; iconUrl?: string }[];
    }

    let sameChain = networks.filter((n) => {
      if (n.chain === primaryWallet.chain) return true;
      if (primaryWallet.chain === "EVM") {
        const chain = (n.chain ?? "").toUpperCase();
        const networkId = String(n.networkId ?? "");
        return EVM_CHAINS.includes(chain) || networkId.startsWith("evm-");
      }
      return false;
    });
    if (sameChain.length === 0 && networks.length > 0 && primaryWallet.chain === "EVM") {
      sameChain = networks.filter(
        (n) => !["SOL", "SUI", "SOLANA"].includes((n.chain ?? "").toUpperCase()),
      );
    }
    // If only 1 same-chain network, show all so dropdown appears (cross-chain switch will error)
    const useAll = sameChain.length <= 1 && networks.length > 1;
    const list = useAll ? networks : sameChain;
    return list.map(normalizeForSwitcher).filter(Boolean) as {
      chain: string;
      networkId: string;
      displayName: string;
      iconUrl?: string;
    }[];
  }, [primaryWallet, networks]);

  const currentNetworkId = networkData?.networkId != null ? String(networkData.networkId) : null;

  const filteredNetworks = useMemo(() => {
    if (showTestnets) return availableNetworks;
    const mainnets = availableNetworks.filter(
      (n) => !isTestnet(n.networkId, n.displayName),
    );
    // Always include current network so user can switch away from a testnet
    if (currentNetworkId && !mainnets.some((n) => n.networkId === currentNetworkId)) {
      const current = availableNetworks.find(
        (n) => n.networkId === currentNetworkId,
      );
      if (current) return [current, ...mainnets];
    }
    return mainnets;
  }, [availableNetworks, showTestnets, currentNetworkId]);

  const hasTestnetsAvailable = availableNetworks.some((n) =>
    isTestnet(n.networkId, n.displayName),
  );

  const handleToggleTestnets = () => {
    const next = !showTestnets;
    setShowTestnets(next);
    localStorage.setItem(SHOW_TESTNETS_KEY, String(next));
  };

  const hasMultiple = availableNetworks.length > 1;

  // Sync chainId to URL so the server-rendered Earn page knows which vaults to fetch.
  // Dynamic's active network is the source of truth; URL is just for the server.
  const syncChainIdToUrl = (networkId: string) => {
    const chainId = networkIdToChainId(networkId);
    if (chainId == null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("chainId", String(chainId));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  // On Earn page with no chainId: sync Dynamic's current network to URL (so vaults match)
  useEffect(() => {
    if (!pathname.includes("/earn") || !currentNetworkId) return;
    if (searchParams.get("chainId")) return;
    const chainId = networkIdToChainId(currentNetworkId);
    if (chainId == null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("chainId", String(chainId));
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, currentNetworkId, searchParams]);

  // When URL has chainId that differs from Dynamic: switch Dynamic to match (e.g. shared link, browser back)
  useEffect(() => {
    if (!pathname.includes("/earn") || !primaryWallet) return;
    const urlChainId = searchParams.get("chainId");
    if (!urlChainId) return;
    const urlChainIdNum = parseInt(urlChainId, 10);
    if (Number.isNaN(urlChainIdNum)) return;
    const currentChainId = networkIdToChainId(currentNetworkId ?? "");
    if (currentChainId === urlChainIdNum) return;
    // Find networkId for this chain (e.g. "1" or "evm-1" for Ethereum)
    const targetNetwork = availableNetworks.find(
      (n) => networkIdToChainId(n.networkId) === urlChainIdNum,
    );
    if (!targetNetwork) return;
    switchActiveNetwork({
      networkId: targetNetwork.networkId,
      walletAccount: primaryWallet,
    })
      .then(() => refetchNetwork())
      .catch(() => {});
  }, [pathname, searchParams, primaryWallet, currentNetworkId, availableNetworks]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[NetworkSwitcher]", {
        userData: primaryWallet
          ? {
              walletId: primaryWallet.id,
              address: primaryWallet.address?.slice(0, 10) + "...",
              chain: primaryWallet.chain,
              connector: !!(primaryWallet as { connector?: unknown }).connector,
            }
          : null,
        networkData: networkData
          ? { networkId: networkData.networkId, displayName: networkData.displayName ?? (networkData as { name?: string }).name }
          : null,
        availableNetworksCount: availableNetworks.length,
        availableNetworks: availableNetworks.map((n) => ({ networkId: n.networkId, displayName: n.displayName })),
        hasMultiple,
        currentNetworkId,
      });
    }
  }, [primaryWallet, networkData, availableNetworks, hasMultiple, currentNetworkId]);

  if (!primaryWallet) return null;

  const handleSelectNetwork = async (networkId: string) => {
    if (networkId === currentNetworkId) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Switch network in Dynamic first (wallet is source of truth); URL sync is for server-rendered Earn
      await switchActiveNetwork({ networkId, walletAccount: primaryWallet });
      await refetchNetwork();
      syncChainIdToUrl(networkId);
    } catch (err) {
      if (err instanceof NetworkNotAddedError && err.networkData) {
        try {
          await addNetwork({
            walletAccount: primaryWallet,
            networkData: err.networkData,
          });
          await switchActiveNetwork({ networkId, walletAccount: primaryWallet });
          await refetchNetwork();
          syncChainIdToUrl(networkId);
        } catch (addErr) {
          const msg =
            addErr instanceof Error ? addErr.message : "Failed to add network";
          setError(msg.includes("unavailable") ? "Wallet cannot add networks" : msg);
        }
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to switch network";
        if (message.includes("unrecognized network")) {
          setError("Network not enabled in dashboard");
        } else if (
          message.toLowerCase().includes("chain") ||
          message.toLowerCase().includes("wallet") ||
          message.toLowerCase().includes("incompatible")
        ) {
          setError("Connect a wallet for this network to switch");
        } else {
          setError(message);
        }
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // When networkData is null (e.g. Solana WaaS), use first network matching wallet chain for display
  const fallbackNetwork =
    primaryWallet &&
    availableNetworks.find(
      (n) =>
        n.chain === primaryWallet.chain ||
        (primaryWallet.chain === "EVM" && EVM_CHAINS.includes(n.chain.toUpperCase())),
    );
  const displayName =
    networkData?.displayName ??
    (networkData as { name?: string })?.name ??
    fallbackNetwork?.displayName ??
    availableNetworks[0]?.displayName ??
    "Network";

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="relative">
        {isOpen && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          onClick={() => hasMultiple && setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium",
            "bg-trade-surface-blue rounded-xl border border-trade-border/50",
            "text-trade-text-primary",
            hasMultiple && "hover:bg-trade-surface-blue/90 cursor-pointer",
            !hasMultiple && "cursor-default",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-all",
          )}
        >
          {(networkData?.iconUrl ??
            (networkData as { iconUrls?: string[] })?.iconUrls?.[0] ??
            fallbackNetwork?.iconUrl ??
            availableNetworks[0]?.iconUrl) && (
            <img
              src={
                networkData?.iconUrl ??
                (networkData as { iconUrls?: string[] })?.iconUrls?.[0] ??
                fallbackNetwork?.iconUrl ??
                availableNetworks[0]?.iconUrl
              }
              alt={displayName}
              className="w-3.5 h-3.5 rounded"
            />
          )}
          <span>{displayName}</span>
          {hasMultiple && (
            <ChevronDown
              className={cn(
                "w-3 h-3 text-trade-text-secondary transition-transform",
                isOpen && "rotate-180",
              )}
            />
          )}
        </button>

        {isOpen && hasMultiple && (
          <div
            className={cn(
              "absolute top-full right-0 mt-1 z-10 min-w-full w-max",
              "bg-trade-surface border border-trade-border rounded-xl shadow-lg overflow-hidden",
            )}
          >
            {filteredNetworks.map((network) => (
              <button
                key={network.networkId}
                type="button"
                onClick={() => handleSelectNetwork(network.networkId)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer whitespace-nowrap",
                  "hover:bg-trade-surface-blue transition-colors",
                  network.networkId === currentNetworkId &&
                    "bg-trade-surface-blue/70",
                )}
              >
                {network.iconUrl && (
                  <img
                    src={network.iconUrl}
                    alt={network.displayName}
                    className="w-4 h-4 rounded shrink-0"
                  />
                )}
                <span className="text-trade-text-primary">
                  {network.displayName}
                </span>
              </button>
            ))}
            {hasTestnetsAvailable && (
              <div
                className="border-t border-trade-border/50 px-3 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="flex items-center gap-2 cursor-pointer text-sm text-trade-text-secondary hover:text-trade-text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={showTestnets}
                    onChange={handleToggleTestnets}
                    className="rounded border-trade-border text-trade-accent focus:ring-trade-accent"
                  />
                  <span>Show testnets</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
