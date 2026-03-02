"use client";

/**
 * Embedded Wallet Widget
 *
 * Displays and manages the user's Dynamic embedded (WaaS) wallet.
 * Shows wallet address, settlement token balance, and provides
 * actions for depositing and logging out.
 *
 * ## Features
 *
 * - **Wallet Display**: Shows truncated address with copy functionality
 * - **Balance**: Fetches and displays settlement token balance via Dynamic SDK
 * - **Actions**: Deposit button (navigates to main widget), Logout button
 * - **Auth Flow**: Shows ConnectWalletScreen when user is not logged in
 *
 * ## States
 *
 * 1. **Loading**: Skeleton UI while initializing or fetching data
 * 2. **Not Logged In**: ConnectWalletScreen for wallet connection
 * 3. **Logged In**: Wallet details with balance and actions
 *
 * ## Route
 *
 * This widget is rendered at `/w/[id]/wallet` when embedded wallet
 * is enabled for the widget (`depositDestination === "embedded"`).
 *
 * @example
 * ```tsx
 * <EmbeddedWalletWidget
 *   widgetId="abc123"
 *   settlementChainId={8453}  // Base
 *   settlementTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // USDC
 * />
 * ```
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Plus } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { truncateAddress, formatUsd } from "@/lib/format";
import { findTokenBalance, type TokenBalance } from "@/lib/balance-utils";
import {
  getEmbeddedWalletAddress,
  getMultichainBalances,
  logout,
  DYNAMIC_ICON_URL,
  type Chain,
} from "@/lib/dynamicClient";
import { useAuth } from "@/hooks/use-auth";
import { WidgetCard } from "@dynamic-demos/ui";
import ConnectWalletScreen, { type WalletGroup } from "./connect-wallet-screen";

// =============================================================================
// TYPES
// =============================================================================

interface EmbeddedWalletWidgetProps {
  /** Widget ID for navigation back to main deposit widget */
  widgetId: string;
  /** Chain type for embedded wallet ("EVM" or "SOL") - defaults to "EVM" */
  settlementChainType?: Chain;
  /** Chain ID to fetch balance for (e.g., 8453 for Base, 101 for Solana) */
  settlementChainId?: number;
  /** Token contract address for balance display (undefined for native token) */
  settlementTokenAddress?: string;
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

// Skeleton component for loading state
function WalletSkeleton() {
  return (
    <WidgetCard>
      <div className="p-3 animate-pulse">
        <div className="flex items-center gap-2.5">
          {/* Icon placeholder */}
          <div className="w-9 h-9 rounded-lg bg-gray-200" />
          <div className="flex-1">
            {/* Title placeholder */}
            <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
            {/* Address placeholder */}
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
          <div className="text-right">
            {/* Balance placeholder */}
            <div className="h-6 w-16 bg-gray-200 rounded ml-auto" />
          </div>
        </div>
      </div>
      <div className="p-2 border-t border-(--widget-border) flex gap-2">
        {/* Deposit button placeholder */}
        <div className="flex-1 h-8 bg-gray-200 rounded-(--widget-radius)" />
        {/* Logout button placeholder */}
        <div className="w-10 h-8 bg-gray-100 rounded-(--widget-radius)" />
      </div>
    </WidgetCard>
  );
}

// Connect screen state
type ConnectScreen =
  | { type: "wallet-list" }
  | { type: "chain-select"; wallet: WalletGroup };

export default function EmbeddedWalletWidget({
  widgetId,
  settlementChainType = "EVM",
  settlementChainId,
  settlementTokenAddress,
}: EmbeddedWalletWidgetProps) {
  const router = useRouter();
  const loggedIn = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Connect flow state
  const [connectScreen, setConnectScreen] = useState<ConnectScreen>({
    type: "wallet-list",
  });
  const [walletConnectCancel, setWalletConnectCancel] = useState<
    (() => void) | null
  >(null);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Reset connect screen when user logs out
  useEffect(() => {
    if (!loggedIn) {
      setConnectScreen({ type: "wallet-list" });
      setWalletConnectCancel(null);
    }
  }, [loggedIn]);

  // Fetch embedded wallet and balance
  useEffect(() => {
    if (!loggedIn) {
      setWalletAddress(null);
      setTokenBalance(null);
      return;
    }

    // 1. Get embedded wallet address for the settlement chain
    const address = getEmbeddedWalletAddress(settlementChainType);
    if (!address) {
      console.log(
        `[EmbeddedWallet] No embedded wallet found for chain: ${settlementChainType}`,
      );
      return;
    }
    setWalletAddress(address);

    // 2. Fetch balance (requires settlement config)
    if (!settlementChainId) return;

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      try {
        const response = await getMultichainBalances({
          balanceRequest: {
            filterSpamTokens: true,
            balanceRequests: [
              {
                address,
                chain: settlementChainType, // Use correct chain type (EVM or SOL)
                networkIds: [settlementChainId],
                ...(settlementTokenAddress && {
                  whitelistedContracts: [settlementTokenAddress],
                }),
              },
            ] as any,
          },
        });

        // 3. Find settlement token balance
        const balance = findTokenBalance(
          response,
          settlementChainId,
          settlementTokenAddress,
        );

        // 4. Display it
        setTokenBalance(balance);
      } catch (error) {
        console.error("[EmbeddedWallet] Failed to fetch balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [
    loggedIn,
    settlementChainType,
    settlementChainId,
    settlementTokenAddress,
  ]);

  const handleCopyAddress = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [walletAddress]);

  const handleDeposit = useCallback(() => {
    router.push(`/w/${widgetId}`);
  }, [router, widgetId]);

  const handleLogout = useCallback(() => {
    logout();
  }, []);

  // Connect flow handlers
  const handleNavigateToChainSelect = useCallback((wallet: WalletGroup) => {
    setConnectScreen({ type: "chain-select", wallet });
  }, []);

  const handleBackFromChainSelect = useCallback(() => {
    setConnectScreen({ type: "wallet-list" });
  }, []);

  const handleWalletConnectStateChange = useCallback(
    (isActive: boolean, cancelFn: (() => void) | null) => {
      setWalletConnectCancel(isActive ? cancelFn : null);
    },
    [],
  );

  // Get connect screen header based on current state
  const getConnectHeader = () => {
    if (connectScreen.type === "chain-select") {
      return {
        title: "Select Network",
        subtitle: `Connect with ${connectScreen.wallet.displayName}`,
        onBack: walletConnectCancel ?? handleBackFromChainSelect,
      };
    }
    return {
      title: "Connect Wallet",
      subtitle: "Sign in to view your embedded wallet",
      onBack: walletConnectCancel ?? undefined,
    };
  };

  // Show skeleton while initializing
  if (!isInitialized) return <WalletSkeleton />;

  // Show Connect Wallet screen when not logged in
  if (!loggedIn) {
    const header = getConnectHeader();
    return (
      <ConnectWalletScreen
        title={header.title}
        subtitle={header.subtitle}
        onBack={header.onBack}
        selectedWalletForChain={
          connectScreen.type === "chain-select" ? connectScreen.wallet : null
        }
        onNavigateToChainSelect={handleNavigateToChainSelect}
        onWalletConnectStateChange={handleWalletConnectStateChange}
      />
    );
  }

  // Show skeleton while wallet address is being fetched
  if (!walletAddress) return <WalletSkeleton />;

  return (
    <WidgetCard>
      {/* Wallet Header with Balance */}
      <div className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-(--widget-row) border border-(--widget-border)">
            <img
              src={DYNAMIC_ICON_URL}
              alt="Embedded Wallet"
              className="w-5 h-5"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--widget-fg)">
              Embedded Wallet
            </p>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="flex items-center gap-1 group cursor-pointer"
            >
              <span className="text-xs text-(--widget-muted) font-mono">
                {truncateAddress(walletAddress, 6, 4)}
              </span>
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-(--widget-muted) opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <div className="text-right">
            {isLoadingBalance ? (
              <div className="w-4 h-4 border-2 border-(--widget-muted) border-t-transparent rounded-full animate-spin" />
            ) : tokenBalance ? (
              <div>
                <p className="text-lg font-semibold text-(--widget-fg)">
                  {formatUsd(tokenBalance.marketValue)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-(--widget-fg)">$0.00</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-2 border-t border-(--widget-border) flex gap-2">
        <button
          type="button"
          onClick={handleDeposit}
          className={cn(
            "flex-1 py-2 rounded-(--widget-radius) text-xs font-medium",
            "bg-(--widget-primary) text-white",
            "hover:bg-(--widget-primary-hover) transition-colors cursor-pointer",
            "flex items-center justify-center gap-1.5",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Deposit
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "py-2 px-3 rounded-(--widget-radius) text-xs font-medium",
            "bg-white text-(--widget-muted) border border-(--widget-border)",
            "hover:bg-(--widget-row) hover:text-(--widget-fg) transition-colors cursor-pointer",
            "flex items-center justify-center gap-1.5",
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </WidgetCard>
  );
}
