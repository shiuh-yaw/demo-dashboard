"use client";

/**
 * Post-auth platform dashboard: embedded wallet identity, aggregate
 * USDC balance with refresh, and the Deposit/Withdraw action row.
 *
 * Reads its data from props — the parent `AuthenticatedShell` owns
 * the balance hook so Dashboard + WithdrawSubFlow share a single
 * fetch.
 */

import { useState } from "react";
import {
  formatUsd,
  getChainIcon,
  truncateAddress,
} from "@dynamic-demos/checkouts-widget";
import { Button } from "@dynamic-demos/ui";
import {
  CopyGlyph,
  DownArrow,
  RefreshGlyph,
  UpArrow,
} from "@/components/icons";
import type { WalletAccount } from "@/lib/dynamic/flow-sdk";
import { USDC_ON_SOLANA } from "../settlement-options";

export function Dashboard({
  walletAccount,
  usdcBalanceUsd,
  loading,
  onRefresh,
  onDeposit,
  onWithdraw,
}: {
  walletAccount: WalletAccount;
  usdcBalanceUsd: number;
  loading: boolean;
  onRefresh: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Hero — embedded wallet identity + USDC balance */}
      <div className="px-5 py-5 border-b border-(--brand-border)">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
            Embedded wallet
          </span>
          <AddressChip
            address={walletAccount.address}
            chainId={USDC_ON_SOLANA.chainId}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.5px] text-(--brand-fg) [font-variant-numeric:tabular-nums]">
              {loading ? "—" : formatUsd(usdcBalanceUsd)}
            </span>
            <RefreshButton onClick={onRefresh} loading={loading} />
          </div>
          <span className="text-xs text-(--brand-muted)">
            {loading
              ? "Loading USDC balance…"
              : usdcBalanceUsd > 0
                ? "USDC balance"
                : "Your wallet's all set — add some USDC whenever you're ready"}
          </span>
        </div>
      </div>

      {/* Action row — Deposit + Withdraw side-by-side.
         Arrow glyphs animate on hover in the direction the action
         implies (↓ slides down, ↑ slides up), matching the
         `transition-transform group-hover:translate-x-0.5` pattern used
         on the landing CTAs and scenario chrome. */}
      <div className="px-5 py-4 flex gap-2">
        <Button
          variant="secondary"
          onClick={onDeposit}
          className="group flex-1 gap-1.5"
        >
          <span className="transition-transform group-hover:translate-y-0.5">
            <DownArrow />
          </span>
          Deposit
        </Button>
        <Button onClick={onWithdraw} className="group flex-1 gap-1.5">
          <span className="transition-transform group-hover:-translate-y-0.5">
            <UpArrow />
          </span>
          Withdraw
        </Button>
      </div>
    </div>
  );
}

function AddressChip({
  address,
  chainId,
}: {
  address: string;
  /**
   * Network the address lives on. Renders a chain icon ahead of the
   * truncated address so users can disambiguate at a glance (e.g. a
   * Solana base58 string vs. an EVM 0x address). Falls back to no
   * icon if the chain isn't in the icon registry.
   */
  chainId?: number;
}) {
  const [copied, setCopied] = useState(false);
  const ChainIcon = chainId !== undefined ? getChainIcon(chainId) : null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      aria-label={`Copy wallet address ${truncateAddress(address)}`}
      title="Copy wallet address"
      className={`inline-flex items-center gap-1.5 rounded-full border border-(--brand-border) bg-(--brand-row-bg) py-1 pr-2 ${ChainIcon ? "pl-1.5" : "pl-2.5"} text-[11px] font-mono text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors [&_*]:pointer-events-none`}
    >
      {ChainIcon && (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <ChainIcon className="block h-full w-full" />
        </span>
      )}
      <span>{truncateAddress(address)}</span>
      <CopyGlyph copied={copied} />
    </button>
  );
}

/**
 * Subtle bordered icon button anchored next to the balance amount.
 * Click triggers a cache-bypass refetch; the glyph spins while the
 * fetch is in flight.
 */
function RefreshButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Refresh balance"
      title="Refresh balance"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-(--brand-border) text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshGlyph spinning={loading} />
    </button>
  );
}
