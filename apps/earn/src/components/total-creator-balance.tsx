"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getEmbeddedWallet,
  getPrimaryWallet,
  waitForClientInitialized,
  fetchMultichainBalances,
  findTokenBalanceInChainBalances,
} from "@/lib/dynamic";
import { getDynamicUsdcAddress, DEFAULT_CHAIN_ID } from "@/lib/contracts";
import { formatCurrency, truncateAddress } from "@dynamic-demos/utils";
import { Skeleton } from "@dynamic-demos/ui";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";
import { useEarnConfig } from "@/contexts/earn-config-context";
import { Copy, Check, ExternalLink } from "lucide-react";

const BASE_SEPOLIA_NETWORK_ID = parseInt(DEFAULT_CHAIN_ID, 10);
const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

interface TotalCreatorBalanceProps {
  /** When this value changes, balance is refetched (e.g. after mint). */
  refreshTrigger?: number;
  /** Polling interval in milliseconds. Set to 0 to disable polling. Default: 15000 (15s) */
  pollInterval?: number;
}

/**
 * Displays the Dynamic PYUSD balance for the WaaS (embedded) wallet.
 * Falls back to primary wallet address if no embedded wallet.
 * Shows "0.00 PYUSD" when no wallet or no balance; shows a loading state while fetching.
 * Uses formatCurrency without dollar sign (token amount, not fiat).
 */
const DEFAULT_POLL_INTERVAL = 15_000; // 15 seconds

export function TotalCreatorBalance(props: TotalCreatorBalanceProps = {}) {
  const { refreshTrigger, pollInterval = DEFAULT_POLL_INTERVAL } = props;
  const [balance, setBalance] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const creatorBalanceContext = useCreatorBalanceOptional();
  const { branding } = useEarnConfig();
  const tokenName = branding.tokenName || "USDC";
  const setCreatorBalanceRef = useRef(creatorBalanceContext?.setBalance);
  setCreatorBalanceRef.current = creatorBalanceContext?.setBalance;

  // Combine local refreshTrigger prop with context refreshKey for comprehensive refresh
  const contextRefreshKey = creatorBalanceContext?.refreshKey ?? 0;
  const combinedRefreshKey = (refreshTrigger ?? 0) + contextRefreshKey;

  // Fetch balance function - extracted for reuse in polling
  const fetchBalance = useCallback(async (isInitialLoad: boolean) => {
    if (isInitialLoad) {
      // Only show loading skeleton on initial load, not during polling
      setLoading(true);
    }

    try {
      await waitForClientInitialized();

      const embedded = getEmbeddedWallet();
      const primary = getPrimaryWallet();
      const account = embedded ?? primary ?? null;
      const address = account?.address;

      if (address) {
        setWalletAddress(address);
      }

      if (!address) {
        setBalance("0.00");
        return;
      }

      const usdcAddress = getDynamicUsdcAddress(DEFAULT_CHAIN_ID);
      if (!usdcAddress) {
        setBalance("0.00");
        return;
      }

      const chainBalances = await fetchMultichainBalances({
        balanceRequest: {
          filterSpamTokens: true,
          balanceRequests: [
            {
              address,
              chain: "EVM",
              networkIds: [BASE_SEPOLIA_NETWORK_ID],
              whitelistedContracts: [usdcAddress],
            },
          ],
        },
      });

      const token = findTokenBalanceInChainBalances(
        chainBalances,
        BASE_SEPOLIA_NETWORK_ID,
        usdcAddress,
      );

      setBalance(token?.balance ?? "0.00");
    } catch {
      // On polling errors, keep existing balance rather than resetting to 0
      if (isInitialLoad) {
        setBalance("0.00");
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  // Initial fetch and manual refresh triggers
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      await fetchBalance(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [combinedRefreshKey, fetchBalance]);

  // Polling effect - runs independently of manual refreshes
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchBalance(false);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollInterval, fetchBalance]);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  // Share balance with Add funds (same logic as this card)
  useEffect(() => {
    if (balance !== null) {
      setCreatorBalanceRef.current?.(balance);
    }
  }, [balance]);

  if (loading) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-28 shrink-0" aria-hidden />
          <span className="text-2xl font-normal leading-none text-earn-text-secondary">
            {tokenName}
          </span>
        </div>
        <Skeleton className="h-4 w-32 mt-1" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mb-2">
      <p className="text-2xl font-normal text-earn-text-primary">
        {formatCurrency(balance ?? "0", { symbol: false })} {tokenName}
      </p>
      {walletAddress && (
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleCopyAddress}
            className="flex items-center gap-1.5 text-xs text-earn-text-secondary hover:text-earn-text-primary transition-colors cursor-pointer"
            title={copied ? "Copied!" : "Click to copy address"}
          >
            <span className="font-mono">{truncateAddress(walletAddress)}</span>
            {copied ? (
              <Check className="w-3 h-3 text-[#137333]" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
          <a
            href={`${BASE_SEPOLIA_EXPLORER}/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-earn-text-secondary hover:text-earn-text-primary transition-colors"
            title="View on BaseScan"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
