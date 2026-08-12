"use client";

import { Send, Shield, Zap, ScanLine, PenLine } from "lucide-react";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { Tooltip, CopyButton, iconButtonHoverClassName } from "@dynamic-demos/ui";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { use7702Authorization } from "@/hooks/use-7702-authorization";
import { useGasSponsorship } from "@/hooks/use-gas-sponsorship";
import { useSignStepUp } from "@/hooks/use-mfa-status";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { isEvmWalletAccount, type WalletAccount } from "@/lib/dynamic";

interface WalletRowProps {
  walletAccount: WalletAccount;
  chain: string;
  onSend: () => void;
  onAuthorize?: () => void;
  onSetupMfa?: (address: string, chain: string) => void;
  onRowClick?: (address: string, chain: string, networkId: number) => void;
  onScan?: (address: string, chain: string, networkId: number) => void;
  onSignMessage?: (address: string, chain: string) => void;
}

/**
 * Wallet row component displaying address and actions
 * Uses SDK data for all display info
 *
 * Action button scenarios:
 * 1. MFA setup needed (Shield) - only if MFA enrollment is required and no device
 * 2. Smart account needed (Zap) - if MFA enabled AND sponsored network AND not authorized
 *    (Without MFA, SDK handles authorization automatically during transaction)
 * 3. Send transaction (Send) - all other cases
 */
export function WalletRow({
  walletAccount,
  chain,
  onSend,
  onAuthorize,
  onSetupMfa,
  onRowClick,
  onScan,
  onSignMessage,
}: WalletRowProps) {
  const { networkData } = useActiveNetwork(walletAccount);
  const { needsEnrollment, requiresStepUp } = useSignStepUp();
  const { walletAccounts } = useWalletAccounts();

  const isEvm = isEvmWalletAccount(walletAccount);

  // Check gas sponsorship availability on current network
  const {
    isSponsored,
    isLoading: sponsorLoading,
    zerodevWallet,
  } = useGasSponsorship(
    isEvm ? walletAccount.address : undefined,
    walletAccounts,
    networkData,
  );

  // Check 7702 authorization status for EVM wallets
  // Note: Check authorization independently of sponsorship to avoid race conditions
  const { isAuthorized, isLoading: authLoading } = use7702Authorization(
    isEvm ? walletAccount.address : undefined,
    networkData,
  );

  // Derived state for action button logic
  const isLoading = sponsorLoading || authLoading;
  // Only show authorize button when MFA is enabled - without MFA, SDK handles auth automatically
  // Note: zerodevWallet existence implies EVM (hook filters by isEvmWalletAccount)
  const canAuthorize =
    !!zerodevWallet && isSponsored && !isAuthorized && requiresStepUp;

  // Determine which action button to show (priority order).
  // 2FA required with nothing enrolled: enrollment is the only thing that can
  // happen, so the row offers it alone - send/sign/scan would dead-end.
  const showMfaSetup = needsEnrollment && onSetupMfa;
  const showAuthorize =
    !showMfaSetup && !isLoading && canAuthorize && onAuthorize;
  const showSend = !showMfaSetup && !showAuthorize;

  // getTransactionHistory supports every registered chain, so every row
  // opens the history screen.
  const isRowClickable = !!onRowClick && !!networkData;

  const handleRowClick = () => {
    if (isRowClickable && networkData) {
      onRowClick(walletAccount.address, chain, Number(networkData.networkId));
    }
  };

  return (
    <div
      role={isRowClickable ? "button" : undefined}
      tabIndex={isRowClickable ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={
        isRowClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRowClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center justify-between",
        "px-3 py-2.5",
        "bg-(--brand-row-bg) rounded-(--brand-radius)",
        "transition-colors hover:bg-(--brand-row-hover)",
        isRowClickable && "cursor-pointer",
      )}
    >
      {/* Left: Chain icon + Address */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Network icon from SDK */}
        <div className="w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-(--brand-surface) border border-(--brand-border) flex items-center justify-center">
          {networkData?.iconUrl ? (
            <img
              src={networkData.iconUrl}
              alt={networkData.displayName}
              className="w-5 h-5 object-contain"
            />
          ) : (
            <span className="text-[10px] font-medium text-(--brand-muted)">
              {walletAccount.chain}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5 truncate">
            {truncateAddress(walletAccount.address)}
          </p>
          <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
            {walletAccount.chain}
            {networkData?.displayName && ` · ${networkData.displayName}`}
          </p>
        </div>
      </div>

      {/* Right: Actions — stopPropagation prevents row click when clicking buttons */}
      <div
        className="flex items-center gap-0 shrink-0"
        role="group"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Copy button */}
        <CopyButton
          text={walletAccount.address}
          label="Copy address"
          showTooltip
          className="rounded-full p-1.5"
        />

        {/* Scan-to-send — needs networkData for the target networkId */}
        {onScan && networkData && !showMfaSetup && (
          <Tooltip content="Scan to send">
            <button
              type="button"
              onClick={() =>
                onScan(
                  walletAccount.address,
                  chain,
                  Number(networkData.networkId),
                )
              }
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                iconButtonHoverClassName,
                "text-(--brand-muted) hover:text-(--brand-fg)",
              )}
              aria-label="Scan QR to send"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Sign message - the cheapest proof the key signs. */}
        {onSignMessage && !showMfaSetup && (
          <Tooltip content="Sign message">
            <button
              type="button"
              onClick={() => onSignMessage(walletAccount.address, chain)}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                iconButtonHoverClassName,
                "text-(--brand-muted) hover:text-(--brand-fg)",
              )}
              aria-label="Sign message"
            >
              <PenLine className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Primary action button - changes based on what's needed */}
        {showMfaSetup ? (
          <Tooltip content="Set up authenticator">
            <button
              type="button"
              onClick={() => onSetupMfa?.(walletAccount.address, chain)}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                iconButtonHoverClassName,
                "text-(--brand-accent)",
              )}
              aria-label="Set up authenticator"
            >
              <Shield className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : showAuthorize ? (
          <Tooltip content="Enable smart account">
            <button
              type="button"
              onClick={onAuthorize}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                iconButtonHoverClassName,
                "text-(--brand-accent)",
              )}
              aria-label="Enable smart account"
            >
              <Zap className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : showSend ? (
          <Tooltip content="Send transaction">
            <button
              type="button"
              onClick={onSend}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                iconButtonHoverClassName,
                "text-(--brand-muted) hover:text-(--brand-fg)",
              )}
              aria-label="Send transaction"
            >
              <Send className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
