"use client";

/**
 * Connect Button
 *
 * Reflects Dynamic auth state: shows truncated wallet address when connected
 * (as a dropdown menu with Reset KYC, Clear selected wallet, and Sign out), "Connect" when not.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  PhoneCall,
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import { DynamicLogo, FireblocksLogomark } from "@dynamic-demos/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useLogout } from "@/hooks/use-mutations";
import { useMockMode } from "@/contexts/mock-mode-context";
import { NetworkSwitcher } from "@/components/ui/network-switcher";
import { METADATA_KEYS } from "@dynamic-demos/dynamic";
import { cn } from "@dynamic-demos/utils";

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const isConnected = useAuth();
  const { primaryWallet, walletAddress: primaryWalletAddress } =
    usePrimaryWallet();
  const { networkData } = useActiveNetwork(primaryWallet);
  const { metadata } = useUserMetadata({ enabled: isConnected });
  const [copied, setCopied] = useState(false);

  const walletType = metadata[METADATA_KEYS.WALLET_TYPE] as
    | "external"
    | "embedded"
    | "fireblocks"
    | undefined;
  const fireblocks = metadata[METADATA_KEYS.FIREBLOCKS] as
    | { vaultId: string; vaultAddress: string }
    | undefined;
  const fireblocksVaultAddress =
    fireblocks?.vaultAddress ??
    (metadata["fireblocks_vault_address"] as string | undefined);

  const displayAddress =
    walletType === "fireblocks" && fireblocksVaultAddress
      ? fireblocksVaultAddress
      : primaryWalletAddress;
  const logoutMutation = useLogout();
  const { isMockMode, toggleMockMode } = useMockMode();

  const explorerBase = (
    networkData as { blockExplorerUrls?: string[] } | undefined
  )?.blockExplorerUrls?.[0];
  const explorerAddressUrl =
    explorerBase && displayAddress
      ? `${explorerBase.replace(/\/$/, "")}/address/${displayAddress}`
      : null;

  const handleCopyAddress = async () => {
    if (!displayAddress) return;
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch {
      // ignore
    }
  };

  const WalletTypeIcon = () => {
    if (walletType === "fireblocks") {
      return (
        <FireblocksLogomark
          className="w-4 h-4 shrink-0"
          variant="navy"
          fill="currentColor"
        />
      );
    }
    if (walletType === "embedded") {
      return <DynamicLogo wordmark={false} className="w-4 h-4 shrink-0" />;
    }
    return <Wallet className="w-4 h-4 shrink-0" />;
  };

  useEffect(() => setMounted(true), []);

  const displayText = !mounted
    ? "Connect"
    : isConnected
      ? displayAddress
        ? truncateAddress(displayAddress)
        : "Connected"
      : "Connect";

  const handleSignOut = async () => {
    await logoutMutation.mutateAsync();
    setIsOpen(false);
    router.push("/login");
  };

  if (!mounted || !isConnected) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium bg-trade-surface-blue text-trade-text-primary cursor-default min-w-[88px] justify-center">
        {displayText}
      </div>
    );
  }

  return (
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
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium",
          "bg-trade-surface border border-trade-border text-trade-text-primary",
          "hover:bg-trade-surface-blue/50 cursor-pointer transition-colors",
        )}
      >
        <WalletTypeIcon />
        {/* Phones show icon + chevron only - the merged SiteHeader's
            wordmark + breadcrumb leave no room for an address pill.
            Trigger styling mirrors earn's user-menu pill. */}
        <span className="hidden sm:inline">{displayText}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-trade-text-secondary shrink-0 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 mt-1 z-10 min-w-full w-max",
            "bg-trade-surface border border-trade-border rounded-xl shadow-lg overflow-hidden",
          )}
        >
          {/* Address header: identity + its actions on one line -
              copy and explorer are icon buttons, not menu rows. */}
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-trade-text-muted border-b border-trade-border/50">
            <WalletTypeIcon />
            <span className="min-w-24">
              {displayAddress ? truncateAddress(displayAddress) : "Connected"}
            </span>
            {displayAddress && (
              <button
                type="button"
                onClick={handleCopyAddress}
                title={copied ? "Copied!" : "Copy address"}
                aria-label="Copy address"
                className="ml-auto p-1 rounded-md cursor-pointer text-trade-text-secondary hover:text-trade-text-primary hover:bg-trade-surface-blue transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            )}
            {explorerAddressUrl && (
              <a
                href={explorerAddressUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                title="View on explorer"
                aria-label="View on explorer"
                className="p-1 rounded-md cursor-pointer text-trade-text-secondary hover:text-trade-text-primary hover:bg-trade-surface-blue transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}
          </div>

          {/* Below md the header bar hides the network switcher
              (AppShell) - it gets a full-width row here, expanding its
              options in place (no nested floating popover). */}
          <div className="px-3 py-1.5 border-b border-trade-border/50 md:hidden">
            <NetworkSwitcher inline />
          </div>

          {/* The one sales CTA post-auth - the header bar stays
              controls-only, so Book a call rides the menu. Accent color
              (Dynamic blue) sets it apart from the utility rows. */}
          <a
            href="https://www.dynamic.xyz/book-a-call"
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-left cursor-pointer",
              "text-trade-accent hover:bg-trade-accent-muted transition-colors",
            )}
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            Book a call
          </a>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
              "hover:bg-trade-surface-blue transition-colors text-trade-text-primary",
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={logoutMutation.isPending}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
              "hover:bg-trade-surface-blue transition-colors text-trade-text-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
