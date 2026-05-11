"use client";

/**
 * ConnectedWalletsScreen
 *
 * Shows all connected wallets with:
 * - List of currently connected wallets
 * - Ability to select a wallet as primary
 * - Option to connect a new wallet at the bottom
 */

import { useEffect, useState, useCallback } from "react";
import {
  getWalletAccounts,
  getPrimaryWalletAccount,
  selectPrimaryWalletAccount,
  removeWalletAccount,
  getWalletDisplayInfo,
  isEmbeddedWallet,
  onEvent,
  logout,
  type WalletAccount,
} from "@/lib/dynamicClient";
import { cn } from "@dynamic-demos/utils";
import { truncateAddress } from "@/lib/format";
import { Plus, Check, Trash2, LogOut } from "lucide-react";
import { WalletIcon } from "@/components/icons";
import ScreenHeader from "./screen-header";
import { getUserSocialAccounts } from "@/lib/dynamicClient";
import { EXCHANGES } from "@/lib/exchanges";
import type { ExchangeAdapter } from "@/lib/exchanges";

interface ConnectedWalletsScreenProps {
  /** Called when user wants to add a new wallet */
  onAddNewWallet?: () => void;
  /** Called when user selects a wallet (to go back to assets) */
  onSelectWallet?: () => void;
  /** Called when user closes the screen */
  onClose?: () => void;
  /** Called when user wants to delete their account */
  onDeleteAccount?: () => void;
  /** Currently active exchange key (null = wallet mode) */
  activeExchangeKey?: string | null;
  /** Called when user selects an exchange as deposit source */
  onSelectExchange?: (exchangeKey: string) => void;
}

interface WalletWithInfo {
  account: WalletAccount;
  name: string;
  iconUrl?: string;
  address: string;
  isPrimary: boolean;
}

export default function ConnectedWalletsScreen({
  onAddNewWallet,
  onSelectWallet,
  onClose,
  onDeleteAccount,
  activeExchangeKey,
  onSelectExchange,
}: ConnectedWalletsScreenProps) {
  const [walletsWithInfo, setWalletsWithInfo] = useState<WalletWithInfo[]>([]);
  const [connectedExchanges, setConnectedExchanges] = useState<
    ExchangeAdapter[]
  >([]);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchWallets = () => {
      try {
        const accounts = getWalletAccounts();
        const primaryAccount = getPrimaryWalletAccount();

        // Filter out embedded wallets from the payment widget's wallet list.
        // Embedded wallets are managed separately via EmbeddedWalletWidget at /wallet.
        // This ensures users only see external wallets (MetaMask, Phantom, etc.) when
        // selecting a source wallet for deposits/payments.
        const externalAccounts = (accounts || []).filter(
          (account) => !isEmbeddedWallet(account),
        );

        setWalletsWithInfo(
          externalAccounts.map((account) => {
            const displayInfo = getWalletDisplayInfo(account.walletProviderKey);
            return {
              account,
              name: displayInfo.name,
              iconUrl: displayInfo.iconUrl,
              address: account.address || "",
              isPrimary: primaryAccount?.address === account.address,
            };
          }),
        );
      } catch {
        setWalletsWithInfo([]);
      }
    };

    // Discover connected exchanges via social accounts
    const fetchExchanges = () => {
      try {
        const socialAccounts = getUserSocialAccounts();
        const connected = EXCHANGES.filter((exchange) =>
          socialAccounts.some((a) => a.provider === exchange.socialProvider),
        );
        setConnectedExchanges(connected);
      } catch {
        setConnectedExchanges([]);
      }
    };

    fetchWallets();
    fetchExchanges();

    const unsub = onEvent({
      event: "walletAccountsChanged",
      listener: fetchWallets,
    });
    return () => unsub?.();
  }, []);

  const handleSelectWallet = useCallback(
    async (wallet: WalletWithInfo) => {
      if (wallet.isPrimary) {
        // Already primary, just go back
        onSelectWallet?.();
        return;
      }

      setIsSelecting(wallet.address);
      try {
        await selectPrimaryWalletAccount({ walletAccount: wallet.account });
        onSelectWallet?.();
      } catch (error) {
        console.error("Error selecting wallet:", error);
      } finally {
        setIsSelecting(null);
      }
    },
    [onSelectWallet],
  );

  const handleRemoveWallet = useCallback(
    async (wallet: WalletWithInfo, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent triggering the select action

      setIsRemoving(wallet.address);
      try {
        await removeWalletAccount({ walletAccount: wallet.account });
        // The walletAccountsChanged event will trigger a refresh
      } catch (error) {
        console.error("Error removing wallet:", error);
      } finally {
        setIsRemoving(null);
      }
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose?.();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [onClose]);

  return (
    <div className="flex flex-col">
      <ScreenHeader
        icon={<WalletIcon size={18} className="text-(--brand-fg)" />}
        title="Your Wallets"
        subtitle="Select a wallet or connect a new one"
        onClose={onClose}
      />

      {/* Wallets Content */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Connected Wallets List */}
        {walletsWithInfo.map((wallet) => {
          // A wallet is "active" if it's primary AND we're not in exchange mode
          const isActive = wallet.isPrimary && !activeExchangeKey;

          return (
            <div
              key={wallet.address}
              className={cn(
                "w-full h-[46px] flex items-center justify-between",
                "bg-(--brand-row-bg) rounded-(--brand-radius)",
                "pl-3 pr-2.5 py-1.5",
                "transition-all duration-150",
                (isSelecting === wallet.address ||
                  isRemoving === wallet.address) &&
                  "opacity-60",
              )}
            >
              {/* Clickable area for selecting wallet */}
              <button
                type="button"
                onClick={() => handleSelectWallet(wallet)}
                disabled={isSelecting !== null || isRemoving !== null}
                className={cn(
                  "flex-1 flex items-center gap-3",
                  "hover:opacity-80 active:opacity-60",
                  "cursor-pointer disabled:cursor-not-allowed",
                  "h-full",
                )}
              >
                {/* Wallet Icon */}
                {wallet.iconUrl ? (
                  <img
                    src={wallet.iconUrl}
                    alt={wallet.name}
                    className="w-7 h-7 object-contain rounded"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-(--brand-row-hover)" />
                )}

                {/* Wallet Name & Address */}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px]">
                    {wallet.name}
                  </span>
                  <span className="text-xs text-(--brand-muted) tracking-[-0.12px]">
                    {truncateAddress(wallet.address)}
                  </span>
                </div>
              </button>

              {/* Primary Indicator or Remove Button */}
              <div className="flex items-center gap-2">
                {isActive ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-[30px] bg-[#22c55e]/10">
                    <Check className="w-3 h-3 text-[#22c55e]" />
                    <span className="text-[11px] font-medium text-[#22c55e] leading-4">
                      Active
                    </span>
                  </div>
                ) : (
                  /* Remove Button - only for non-active wallets */
                  <button
                    type="button"
                    onClick={(e) => handleRemoveWallet(wallet, e)}
                    disabled={isRemoving !== null || isSelecting !== null}
                    className={cn(
                      "p-1.5 rounded-full cursor-pointer",
                      "text-(--brand-muted) hover:text-red-500",
                      "hover:bg-red-50 dark:hover:bg-red-500/10",
                      "transition-colors duration-150",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isRemoving === wallet.address && "opacity-60",
                    )}
                    aria-label={`Remove ${wallet.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Connected Exchanges */}
        {connectedExchanges.map((exchange) => {
          const isActive = activeExchangeKey === exchange.key;
          const IconComponent = exchange.iconComponent;

          return (
            <button
              key={exchange.key}
              type="button"
              onClick={() => onSelectExchange?.(exchange.key)}
              className={cn(
                "w-full h-[46px] flex items-center justify-between",
                "bg-(--brand-row-bg) rounded-(--brand-radius)",
                "pl-3 pr-2.5 py-1.5",
                "transition-all duration-150",
                "hover:opacity-80 active:opacity-60",
                "cursor-pointer",
              )}
            >
              <div className="flex items-center gap-3">
                {IconComponent ? (
                  <IconComponent className="w-7 h-7" />
                ) : exchange.iconUrl ? (
                  <img
                    src={exchange.iconUrl}
                    alt={exchange.name}
                    className="w-7 h-7 object-contain rounded"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-(--brand-row-hover)" />
                )}
                <span className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px]">
                  {exchange.name}
                </span>
              </div>

              {isActive && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-[30px] bg-[#22c55e]/10">
                  <Check className="w-3 h-3 text-[#22c55e]" />
                  <span className="text-[11px] font-medium text-[#22c55e] leading-4">
                    Active
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Empty state */}
        {walletsWithInfo.length === 0 && connectedExchanges.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-sm text-(--brand-muted)">
              No wallets connected
            </p>
          </div>
        )}

        {/* Divider */}
        {(walletsWithInfo.length > 0 || connectedExchanges.length > 0) && (
          <div className="h-px bg-(--brand-border) my-1" />
        )}

        {/* Add New Wallet + Logout Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddNewWallet}
            className={cn(
              "flex-1 h-[43px] flex items-center justify-center gap-2",
              "bg-(--brand-row-bg) rounded-(--brand-radius)",
              "text-sm font-medium text-(--brand-muted)",
              "hover:bg-(--brand-row-hover) active:opacity-80",
              "transition-all duration-150 cursor-pointer",
              "border border-dashed border-(--brand-border)",
            )}
          >
            <Plus className="w-4 h-4" />
            Connect New Wallet
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "h-[43px] w-[43px] flex items-center justify-center",
              "rounded-(--brand-radius)",
              "border border-(--brand-border)",
              "bg-(--brand-row-bg) hover:bg-red-50 dark:hover:bg-red-500/10",
              "text-(--brand-muted) hover:text-red-500 hover:border-red-200",
              "transition-all duration-150 cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoggingOut && "animate-pulse",
            )}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Account */}
        {onDeleteAccount && (
          <button
            type="button"
            onClick={onDeleteAccount}
            className={cn(
              "py-1 w-full text-center",
              "text-xs text-(--brand-muted) hover:text-red-500",
              "transition-colors duration-150 cursor-pointer",
            )}
          >
            Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
