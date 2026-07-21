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
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import {
  BookACallMenuRow,
  DynamicLogo,
  FireblocksLogomark,
  HeaderMenu,
  HeaderMenuRow,
  headerMenuRowClassName,
  useHeaderMenu,
} from "@dynamic-demos/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useLogout } from "@/hooks/use-mutations";
import { useMockMode } from "@/contexts/mock-mode-context";
import { NetworkSwitcher } from "@/components/ui/network-switcher";
import { METADATA_KEYS } from "@dynamic-demos/dynamic";

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Identity header: address + its actions on one line - copy and
 * explorer are icon buttons, not menu rows. Copy keeps the menu open so
 * the "copied" check is visible; explorer closes it (new tab).
 */
function AddressHeader({
  walletTypeIcon,
  displayAddress,
  explorerAddressUrl,
}: {
  walletTypeIcon: React.ReactNode;
  displayAddress: string | undefined;
  explorerAddressUrl: string | null;
}) {
  const { close } = useHeaderMenu();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!displayAddress) return;
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex w-full items-center gap-2 text-xs text-(--brand-muted)">
      {walletTypeIcon}
      <span className="min-w-24">
        {displayAddress ? truncateAddress(displayAddress) : "Connected"}
      </span>
      {displayAddress && (
        <button
          type="button"
          onClick={handleCopyAddress}
          title={copied ? "Copied!" : "Copy address"}
          aria-label="Copy address"
          className="ml-auto p-1 rounded-md cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
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
          onClick={close}
          title="View on explorer"
          aria-label="View on explorer"
          className="p-1 rounded-md cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      )}
    </div>
  );
}

/** Settings keeps next/link (client-side nav); the shell only exports the row class. */
function SettingsMenuRow() {
  const { close } = useHeaderMenu();
  return (
    <Link
      href="/settings"
      onClick={close}
      className={headerMenuRowClassName("default")}
      role="menuitem"
    >
      <Settings className="w-4 h-4 shrink-0" />
      Settings
    </Link>
  );
}

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isConnected = useAuth();
  const { primaryWallet, walletAddress: primaryWalletAddress } =
    usePrimaryWallet();
  const { networkData } = useActiveNetwork(primaryWallet);
  const { metadata } = useUserMetadata({ enabled: isConnected });

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
    <HeaderMenu
      trigger={
        <>
          <WalletTypeIcon />
          {/* Phones show icon + chevron only - the merged SiteHeader's
              wordmark + breadcrumb leave no room for an address pill. */}
          <span className="hidden sm:inline">{displayText}</span>
        </>
      }
      header={
        <AddressHeader
          walletTypeIcon={<WalletTypeIcon />}
          displayAddress={displayAddress}
          explorerAddressUrl={explorerAddressUrl}
        />
      }
    >
      {/* Below md the header bar hides the network switcher (AppShell) -
          it gets a full-width row here, expanding its options in place
          (no nested floating popover). */}
      <div className="px-3 py-1.5 border-b border-(--brand-border)/50 md:hidden">
        <NetworkSwitcher inline />
      </div>
      <BookACallMenuRow />
      <SettingsMenuRow />
      <HeaderMenuRow
        icon={<LogOut className="w-4 h-4 shrink-0" />}
        onClick={handleSignOut}
        disabled={logoutMutation.isPending}
      >
        Sign out
      </HeaderMenuRow>
    </HeaderMenu>
  );
}
