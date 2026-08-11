"use client";

import { useState, useMemo } from "react";
import { Wallet } from "lucide-react";
import { WalletRow } from "./wallet-row";
import { ScrollableWithFade } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import type { WalletAccount } from "@/lib/dynamic";

interface UniqueWallet {
  address: string;
  chain: string;
  walletAccount: WalletAccount;
  hasZeroDev: boolean;
}

interface ScrollableWalletListProps {
  wallets: UniqueWallet[];
  onSend: (address: string, chain: string) => void;
  onAuthorize?: (address: string) => void;
  onSetupMfa?: (address: string, chain: string) => void;
  onRowClick?: (address: string, chain: string, networkId: number) => void;
  onScan?: (address: string, chain: string, networkId: number) => void;
  onSignMessage?: (address: string, chain: string) => void;
}

type ChainFilter = "all" | string;

/**
 * Scrollable wallet list with chain filter tabs
 */
export function ScrollableWalletList({
  wallets,
  onSend,
  onAuthorize,
  onSetupMfa,
  onRowClick,
  onScan,
  onSignMessage,
}: ScrollableWalletListProps) {
  const [filter, setFilter] = useState<ChainFilter>("all");

  // Build available chains from actual wallet data
  const availableChains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const wallet of wallets) {
      counts.set(wallet.chain, (counts.get(wallet.chain) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([chain, count]) => ({
      chain,
      count,
    }));
  }, [wallets]);

  // Filter wallets based on selected tab
  const filteredWallets = useMemo(() => {
    if (filter === "all") return wallets;
    return wallets.filter((w) => w.chain === filter);
  }, [wallets, filter]);

  // Only show tabs if we have wallets on multiple chains
  const showTabs = availableChains.length > 1;

  if (wallets.length === 0) {
    return (
      <div className="text-center py-8">
        <Wallet
          className="w-12 h-12 mx-auto text-(--brand-muted) mb-3"
          strokeWidth={1.5}
        />
        <p className="text-sm text-(--brand-muted)">
          No wallets yet. Create one below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chain filter tabs - only shown when wallets exist on multiple chains */}
      {showTabs && (
        <div className="flex gap-0.5 p-1 bg-(--brand-row-bg) border border-(--brand-border) rounded-(--brand-radius)">
          <FilterTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={wallets.length}
          >
            All
          </FilterTab>
          {availableChains.map(({ chain, count }) => (
            <FilterTab
              key={chain}
              active={filter === chain}
              onClick={() => setFilter(chain)}
              count={count}
            >
              {chain}
            </FilterTab>
          ))}
        </div>
      )}

      {/* Wallet list */}
      <ScrollableWithFade contentClassName="space-y-2">
        {filteredWallets.map((wallet) => (
          <WalletRow
            key={wallet.address}
            walletAccount={wallet.walletAccount}
            chain={wallet.chain}
            onSend={() => onSend(wallet.address, wallet.chain)}
            onAuthorize={
              onAuthorize ? () => onAuthorize(wallet.address) : undefined
            }
            onSetupMfa={onSetupMfa}
            onRowClick={onRowClick}
            onScan={onScan}
            onSignMessage={onSignMessage}
          />
        ))}
      </ScrollableWithFade>
    </div>
  );
}

/**
 * Filter tab button
 */
function FilterTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 min-w-0 px-1 py-1.5 text-xs font-medium rounded-[calc(var(--brand-radius)-4px)] transition-colors cursor-pointer whitespace-nowrap",
        active
          ? "bg-(--brand-surface) text-(--brand-fg) shadow-sm border border-(--brand-border)"
          : "text-(--brand-muted) hover:text-(--brand-fg) border border-transparent",
      )}
    >
      {children}
      <span
        className={cn(
          "ml-1 text-[10px]",
          active ? "text-(--brand-muted)" : "text-(--brand-muted)/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}
