"use client";

/**
 * WcCatalogList
 *
 * Searchable, scrollable list of WalletConnect catalog wallets.
 * Used after chain selection in the WalletConnect flow.
 */

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { ListRow } from "@dynamic-demos/ui";
import { ErrorBanner, type ErrorInfo } from "@dynamic-demos/checkouts-widget";
import type { WalletConnectCatalogWallet } from "@/lib/dynamicClient";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Max height for the scrollable wallet list on desktop (roughly 6 rows) */
const WALLET_LIST_MAX_HEIGHT = "264px";

// =============================================================================
// TYPES
// =============================================================================

interface WcCatalogListProps {
  /** Catalog wallets to display */
  wallets: WalletConnectCatalogWallet[];
  /** Currently connecting wallet name (prefixed with "wc:") */
  connecting: string | null;
  /** Error state */
  error: ErrorInfo | null;
  /** Clear error */
  onClearError: () => void;
  /** Called when a wallet is selected */
  onSelectWallet: (wallet: WalletConnectCatalogWallet) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WcCatalogList({
  wallets,
  connecting,
  error,
  onClearError,
  onSelectWallet,
}: WcCatalogListProps) {
  const [search, setSearch] = useState("");

  const filteredWallets = search
    ? wallets.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : wallets;

  return (
    <div className="flex flex-col gap-1.5">
      <ErrorBanner error={error} onDismiss={onClearError} />

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--brand-muted)" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search wallets"
          className={cn(
            "w-full h-[38px] pl-8.5 pr-3",
            "bg-(--brand-row-bg) rounded-(--brand-radius)",
            "text-sm text-(--brand-fg) placeholder:text-(--brand-muted)",
            "border border-(--brand-border)",
            "outline-none focus:border-(--brand-accent)",
            "transition-colors",
          )}
        />
      </div>

      {/* Wallet list */}
      {filteredWallets.length === 0 ? (
        <p className="text-xs text-(--brand-muted) text-center py-4">
          {search
            ? "No wallets match your search."
            : "No wallets found for this network."}
        </p>
      ) : (
        <div
          className="flex flex-col gap-1.5 overflow-y-auto max-sm:max-h-none"
          style={{ maxHeight: WALLET_LIST_MAX_HEIGHT }}
        >
          {filteredWallets.map((wallet, index) => (
            <ListRow
              key={`${wallet.name}-${index}`}
              label={wallet.name}
              iconUrl={wallet.spriteUrl}
              isLoading={connecting === `wc:${wallet.name}`}
              loadingText="Connecting..."
              disabled={connecting !== null}
              onClick={() => onSelectWallet(wallet)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
