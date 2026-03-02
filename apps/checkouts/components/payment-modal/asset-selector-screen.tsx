"use client";

/**
 * Asset Selector Screen
 *
 * Displays the user's token balances and allows selection for payment/deposit.
 * Uses shared utilities from balance-utils.ts and dynamicClient.ts.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getPrimaryWalletAccount,
  getMultichainBalances,
  getWalletDisplayInfo,
  getWalletChain,
  getEnabledNetworkIds,
  onEvent,
  type WalletAccount,
} from "@/lib/dynamicClient";
import {
  transformToTokenAssets,
  logBalanceDebug,
  isExchangeToken,
  type TokenAsset,
} from "@/lib/balance-utils";
import { cn } from "@dynamic-demos/utils";
import { INITIAL_TOKENS_SHOWN } from "@/lib/config";
import { formatUsd, truncateAddress } from "@/lib/format";
import { type WidgetMode } from "@/lib/widget-config";
import { ChevronDown } from "lucide-react";
import { DollarCircleIcon } from "@/components/icons";
import ScreenHeader from "./screen-header";
import { Skeleton, ListRow } from "@dynamic-demos/ui";
import { getExchangeAdapter, EXCHANGES } from "@/lib/exchanges";
import { getUserSocialAccounts } from "@/lib/dynamicClient";

/**
 * Calculate the token list container height based on number of tokens to show
 * - Each token row: 46px
 * - Gap between rows: 6px (gap-1.5)
 * - "Show more" button: ~36px (only if there are more tokens)
 * - Padding: 24px
 * - Minimum height for loading/empty states
 */
function calculateTokenListHeight(
  initialTokensToShow: number,
  totalTokens: number,
  isLoading: boolean,
): number {
  const ROW_HEIGHT = 46;
  const GAP = 6;
  const SHOW_MORE_BUTTON = 36;
  const PADDING = 30;
  const SKELETON_COUNT = 2; // Number of skeleton rows to show during loading

  // During loading, show space for skeleton rows
  if (isLoading) {
    return SKELETON_COUNT * ROW_HEIGHT + (SKELETON_COUNT - 1) * GAP + PADDING;
  }

  // Empty state - match the 2-skeleton loading height for consistency
  if (totalTokens === 0) {
    return SKELETON_COUNT * ROW_HEIGHT + (SKELETON_COUNT - 1) * GAP + PADDING;
  }

  // Show the minimum of configured initial count or actual token count
  const visibleTokens = Math.min(initialTokensToShow, totalTokens);

  // Only include "Show more" button if there are additional tokens
  const hasMoreTokens = totalTokens > initialTokensToShow;
  const buttonHeight = hasMoreTokens ? SHOW_MORE_BUTTON : 0;

  return (
    visibleTokens * ROW_HEIGHT +
    Math.max(0, visibleTokens - 1) * GAP +
    buttonHeight +
    PADDING
  );
}

// TokenAsset type is imported from @/lib/balance-utils
// Wallet chain utilities are imported from @/lib/dynamicClient

interface AssetSelectorScreenProps {
  mode: WidgetMode;
  paymentAmount: number;
  /** When set, fetch balances from this exchange instead of the primary wallet */
  activeExchangeKey?: string | null;
  /** Settlement token symbol — used to disable non-matching exchange tokens */
  settlementTokenSymbol?: string;
  onSelectToken?: (token: TokenAsset) => void;
  onSwitchWallet?: () => void;
  onClose?: () => void;
  /** True when fetching a quote for the selected token */
  isLoadingQuote?: boolean;
  /** Error message from quote fetch */
  quoteError?: string | null;
}

export default function AssetSelectorScreen({
  mode,
  paymentAmount,
  activeExchangeKey,
  settlementTokenSymbol,
  onSelectToken,
  onSwitchWallet,
  onClose,
  isLoadingQuote = false,
  quoteError,
}: AssetSelectorScreenProps) {
  const actionLabel = mode === "deposit" ? "Deposit" : "Pay";
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{
    name: string;
    iconUrl?: string;
    address?: string;
    /** When true, this source is an exchange (render iconComponent instead of img) */
    isExchange?: boolean;
    /** React component for the exchange icon */
    iconComponent?: React.ComponentType<{ className?: string }>;
  } | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const formattedPaymentAmount = formatUsd(paymentAmount);
  const fetchBalances = useCallback(
    async (wallet: WalletAccount) => {
      if (!wallet.address) return;

      setIsLoadingBalances(true);
      setBalanceError(null);

      try {
        // Get wallet chain and network IDs using shared utilities
        const chainType = getWalletChain(wallet);
        if (!chainType) {
          console.warn("[AssetSelector] Could not determine chain type");
          setTokens([]);
          return;
        }

        const networkIds = getEnabledNetworkIds(chainType);
        if (!networkIds.length) {
          console.warn("[AssetSelector] No network IDs for chain:", chainType);
          setTokens([]);
          return;
        }

        // Fetch balances from Dynamic SDK
        const response = await getMultichainBalances({
          balanceRequest: {
            filterSpamTokens: true,
            balanceRequests: [
              {
                address: wallet.address,
                chain: chainType,
                networkIds,
              },
            ] as unknown as Parameters<
              typeof getMultichainBalances
            >[0]["balanceRequest"]["balanceRequests"],
          },
        });

        // Debug: log all tokens and filter reasons
        logBalanceDebug(response, paymentAmount);

        // Transform and filter using shared utility
        const assets = transformToTokenAssets(response, {
          minUsdValue: paymentAmount,
          excludeZeroBalance: true,
        });

        setTokens(assets);
      } catch (error) {
        console.error("[AssetSelector] fetchBalances error:", error);
        setBalanceError("Failed to load balances");
        setTokens([]);
      } finally {
        setIsLoadingBalances(false);
      }
    },
    [paymentAmount],
  );

  // Fetch balances from exchange adapter
  const fetchExchangeBalances = useCallback(async (exchangeKey: string) => {
    const adapter = getExchangeAdapter(exchangeKey);
    if (!adapter) return;

    setWalletInfo({
      name: adapter.name,
      iconComponent: adapter.iconComponent,
      isExchange: true,
    });
    setIsLoadingBalances(true);
    setBalanceError(null);

    try {
      const assets = await adapter.getBalances();
      setTokens(assets);
    } catch (error) {
      console.error("[AssetSelector] fetchExchangeBalances error:", error);
      setBalanceError("Failed to load exchange balances");
      setTokens([]);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  useEffect(() => {
    // Exchange mode — fetch from the adapter, skip wallet logic entirely
    if (activeExchangeKey) {
      fetchExchangeBalances(activeExchangeKey);
      return; // No wallet event listener needed for exchange mode
    }

    // Wallet mode — existing behavior (completely unchanged)
    const fetchWalletInfo = async () => {
      try {
        const wallet = getPrimaryWalletAccount();

        if (wallet) {
          const displayInfo = getWalletDisplayInfo(wallet.walletProviderKey);
          setWalletInfo({
            name: displayInfo.name,
            iconUrl: displayInfo.iconUrl,
            address: wallet.address,
          });
          await fetchBalances(wallet);
        } else {
          // No primary wallet — check for connected exchanges as fallback
          // so the switcher still shows and exchange balances are displayed
          const socialAccounts = getUserSocialAccounts();
          const connectedExchange = EXCHANGES.find((e) =>
            socialAccounts.some((a) => a.provider === e.socialProvider),
          );

          if (connectedExchange) {
            await fetchExchangeBalances(connectedExchange.key);
          } else {
            console.warn(
              "[AssetSelector] No primary wallet or connected exchange found",
            );
          }
        }
      } catch (error) {
        console.error("[AssetSelector] fetchWalletInfo - Error:", error);
      }
    };

    fetchWalletInfo();

    const unsubWallet = onEvent({
      event: "walletAccountsChanged",
      listener: () => fetchWalletInfo(),
    });

    return () => {
      unsubWallet?.();
    };
  }, [activeExchangeKey, fetchBalances, fetchExchangeBalances]);

  const handleTokenSelect = useCallback(
    (token: TokenAsset) => {
      if (isLoadingQuote) return; // Prevent selecting another token while loading
      setSelectedToken(token.id);
      onSelectToken?.(token);
    },
    [onSelectToken, isLoadingQuote],
  );

  return (
    <div className="flex flex-col">
      {/* Header Section (includes wallet switcher) */}
      <div className="border-b border-(--widget-border)">
        <ScreenHeader
          icon={<DollarCircleIcon size={18} className="text-(--widget-fg)" />}
          title={
            <>
              {actionLabel}{" "}
              <span className="text-(--widget-accent)">
                {formattedPaymentAmount}
              </span>
            </>
          }
          subtitle="Choose any token from your wallet"
          onClose={onClose}
          noBorder
        />

        {/* Wallet Switcher */}
        {walletInfo && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={onSwitchWallet}
              className={cn(
                "w-full h-[46px] flex items-center justify-between",
                "bg-(--widget-row-bg) rounded-(--widget-radius)",
                "pl-3 pr-2.5 py-1.5",
                "transition-all duration-150",
                "hover:bg-(--widget-row-hover) active:opacity-80",
                "cursor-pointer",
              )}
            >
              <div className="flex items-center gap-3">
                {walletInfo.isExchange && walletInfo.iconComponent ? (
                  <walletInfo.iconComponent className="w-7 h-7" />
                ) : walletInfo.iconUrl ? (
                  <img
                    src={walletInfo.iconUrl}
                    alt={walletInfo.name}
                    className="w-7 h-7 object-contain rounded"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-(--widget-row-hover)" />
                )}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-(--widget-fg) tracking-[-0.14px]">
                    {walletInfo.name}
                  </span>
                  {walletInfo.address && (
                    <span className="text-xs text-(--widget-muted) tracking-[-0.12px]">
                      {truncateAddress(walletInfo.address)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 px-2 py-1 rounded-[30px] bg-(--widget-row-hover)">
                <span className="text-[11px] font-medium text-(--widget-muted) leading-4">
                  Switch
                </span>
                <ChevronDown className="w-3 h-3 text-(--widget-muted)" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Token List - calculated height based on initial tokens, scrolls when expanded */}
      <div
        className="overflow-y-auto p-3 flex flex-col gap-1.5"
        style={{
          height: calculateTokenListHeight(
            INITIAL_TOKENS_SHOWN,
            tokens.length,
            isLoadingBalances,
          ),
        }}
      >
        {/* Loading Skeletons */}
        {isLoadingBalances && (
          <div className="flex flex-col gap-1.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="w-full h-[46px] flex items-center justify-between bg-(--widget-row-bg) rounded-(--widget-radius) pl-3 pr-2.5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        )}

        {/* Balance Error */}
        {!isLoadingBalances && balanceError && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">{balanceError}</p>
          </div>
        )}

        {/* Quote Error */}
        {quoteError && (
          <div className="p-3 bg-red-50 rounded-lg mb-2">
            <p className="text-xs text-red-600">{quoteError}</p>
          </div>
        )}

        {/* Token List */}
        {!isLoadingBalances && !balanceError && tokens.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {(showAllTokens
              ? tokens
              : tokens.slice(0, INITIAL_TOKENS_SHOWN)
            ).map((token) => (
              <ListRow
                key={token.id}
                label={token.name}
                sublabel={`${token.balance} ${token.symbol}`}
                iconUrl={token.iconUrl}
                iconUrlFallback={token.iconUrlFallback}
                iconRounded
                size="lg"
                isLoading={selectedToken === token.id && isLoadingQuote}
                loadingText="Getting quote..."
                disabled={
                  (isLoadingQuote && selectedToken !== token.id) ||
                  (isExchangeToken(token) &&
                    !!settlementTokenSymbol &&
                    token.symbol !== settlementTokenSymbol)
                }
                onClick={() => handleTokenSelect(token)}
                rightContent={
                  <span className="text-sm font-medium text-(--widget-fg,#000) tracking-[-0.14px]">
                    {token.usdValue}
                  </span>
                }
              />
            ))}

            {tokens.length > INITIAL_TOKENS_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAllTokens(!showAllTokens)}
                className={cn(
                  "w-full py-2 mt-1",
                  "text-xs font-medium text-(--widget-muted)",
                  "hover:text-(--widget-accent) transition-colors",
                  "cursor-pointer",
                )}
              >
                {showAllTokens
                  ? "Show less"
                  : `Show ${tokens.length - INITIAL_TOKENS_SHOWN} more tokens`}
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingBalances && !balanceError && tokens.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-(--widget-muted) text-center px-4">
              No tokens with sufficient balance to {actionLabel.toLowerCase()}{" "}
              {formattedPaymentAmount}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { TokenAsset };
