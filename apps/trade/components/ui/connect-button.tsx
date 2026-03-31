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
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Wallet,
  FlaskConical,
} from "lucide-react";
import { DynamicLogo, FireblocksLogomark } from "@dynamic-demos/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useLogout } from "@/hooks/use-mutations";
import { useMockMode } from "@/contexts/mock-mode-context";
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
          "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium",
          "bg-trade-surface-blue text-trade-text-primary",
          "hover:bg-trade-surface-blue/90 cursor-pointer transition-colors",
        )}
      >
        <WalletTypeIcon />
        <span>{displayText}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-trade-text-secondary transition-transform",
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
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-trade-text-muted border-b border-trade-border/50">
            <WalletTypeIcon />
            {displayAddress ? truncateAddress(displayAddress) : "Connected"}
          </div>

          {displayAddress && (
            <button
              type="button"
              onClick={handleCopyAddress}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
                "hover:bg-trade-surface-blue transition-colors text-trade-text-primary",
              )}
            >
              <Copy className="w-4 h-4 shrink-0" />
              {copied ? "Copied!" : "Copy address"}
            </button>
          )}

          {explorerAddressUrl && (
            <a
              href={explorerAddressUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
                "hover:bg-trade-surface-blue transition-colors text-trade-text-primary",
              )}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              View on explorer
            </a>
          )}

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
          <div
            className="border-t border-trade-border/50 px-3 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex items-center gap-2 cursor-pointer text-sm text-trade-text-secondary hover:text-trade-text-primary transition-colors">
              <input
                type="checkbox"
                checked={isMockMode}
                onChange={toggleMockMode}
                className="rounded border-trade-border text-trade-accent focus:ring-trade-accent"
              />
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span>Mock mode</span>
            </label>
          </div>
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
