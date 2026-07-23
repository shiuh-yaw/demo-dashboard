"use client";

/**
 * Exchange Asset List
 *
 * Fetches and displays token balances from a connected exchange
 * adapter. Mirrors the visual style of the package's
 * AssetSelectorScreen (same header, same token row layout) but
 * backed by exchange balance data instead of on-chain balances.
 */

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import { cn } from "@dynamic-demos/utils";
import {
  type TokenAsset,
  ChainBadge,
} from "@dynamic-demos/checkouts-widget";
import type { ExchangeAdapter } from "@/lib/exchanges/types";

interface ExchangeAssetListProps {
  adapter: ExchangeAdapter;
  onSelected: (token: TokenAsset) => void;
  onChangeSource?: () => void;
  mode: string;
  amount?: string;
  currency?: string;
}

// Match the wallet AssetSelectorScreen dimensions.
const ROW_HEIGHT_PX = 62;
const ROW_GAP_PX = 8;
const MAX_VISIBLE = 5;

export function ExchangeAssetList({
  adapter,
  onSelected,
  onChangeSource,
  mode,
  amount,
  currency = "USD",
}: ExchangeAssetListProps) {
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assets = await adapter.getBalances();
      setTokens(assets);
    } catch (err) {
      console.error("[ExchangeAssetList] fetchBalances error:", err);
      setError("Failed to load exchange balances");
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const formattedAmount = amount ? `$${amount}` : undefined;
  const eyebrow = formattedAmount ? `${mode} ${formattedAmount}` : mode;

  const maxHeight =
    MAX_VISIBLE * ROW_HEIGHT_PX +
    Math.max(0, MAX_VISIBLE - 1) * ROW_GAP_PX -
    2;
  const shouldScroll = tokens.length > MAX_VISIBLE;

  return (
    <div className="flex flex-col gap-4">
      {/* Header — mirrors DefaultAssetSelectorHeader from CheckoutWidget */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-muted,#99a0ae)] font-medium">
            {eyebrow}
          </span>
          <h3 className="text-base font-semibold text-[var(--brand-fg,#0e121b)] tracking-[-0.01em]">
            Pick a token
          </h3>
        </div>
        {onChangeSource && (
          <button
            type="button"
            onClick={onChangeSource}
            aria-label={`Back to sources (connected: ${adapter.name})`}
            title="Back to sources"
            className="inline-flex items-center gap-1.5 self-end rounded-full border border-[var(--brand-border,#e1e4ea)] bg-[var(--brand-surface,#ffffff)] pl-2.5 pr-2 py-1 text-[11px] font-mono text-[var(--brand-muted,#99a0ae)] hover:text-[var(--brand-fg,#0e121b)] hover:bg-[var(--brand-row-hover,#f4f5f7)] transition-colors [&_*]:pointer-events-none"
          >
            <span>{adapter.name}</span>
            <SwapGlyph />
          </button>
        )}
      </div>

      {/* Token list — mirrors AssetSelectorScreen token rows */}
      <div
        className={cn(
          "flex flex-col gap-2",
          shouldScroll && "overflow-y-auto pr-1",
        )}
        style={shouldScroll ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--widget-row-hover,var(--brand-row-bg,#f4f5f7))] px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--brand-muted,#99a0ae)]/20 animate-pulse" />
                <span className="flex flex-col gap-1">
                  <span className="h-3 w-20 rounded bg-[var(--brand-muted,#99a0ae)]/20 animate-pulse" />
                  <span className="h-2.5 w-14 rounded bg-[var(--brand-muted,#99a0ae)]/10 animate-pulse" />
                </span>
              </span>
              <span className="h-4 w-10 rounded bg-[var(--brand-muted,#99a0ae)]/20 animate-pulse" />
            </div>
          ))
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[var(--brand-muted,#99a0ae)]">{error}</p>
            <button
              type="button"
              onClick={fetchBalances}
              className="text-sm font-medium text-[var(--brand-accent,#0050ff)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-[var(--brand-muted,#99a0ae)]">
              No tokens with balance found on {adapter.name}.
            </p>
          </div>
        ) : (
          tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              onSelect={onSelected}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TokenRow({
  token,
  onSelect,
}: {
  token: TokenAsset;
  onSelect: (token: TokenAsset) => void;
}) {
  const handleIconError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (token.iconUrlFallback && img.src !== token.iconUrlFallback) {
      img.src = token.iconUrlFallback;
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(token)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--widget-row-hover,var(--brand-row-bg,#f4f5f7))] px-4 py-3 text-left transition-colors hover:brightness-95 [&_*]:pointer-events-none"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative inline-flex h-8 w-8 shrink-0">
          {token.iconUrl ? (
            <img
              src={token.iconUrl}
              alt=""
              className="h-8 w-8 rounded-full bg-[var(--widget-bg,var(--brand-surface,#ffffff))] object-cover"
              onError={handleIconError}
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--widget-bg,var(--brand-surface,#ffffff))] border border-[var(--widget-border,var(--brand-border,#e1e4ea))] text-[10px] font-mono font-semibold text-[var(--widget-muted,var(--brand-muted,#99a0ae))]">
              {token.symbol.slice(0, 3).toUpperCase()}
            </span>
          )}
          {token.chainId !== 0 && (
            <ChainBadge chainId={token.chainId} />
          )}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[15px] font-medium text-[var(--widget-fg,var(--brand-fg,#0e121b))] truncate">
            {token.name}
          </span>
          <span className="text-[11px] text-[var(--widget-muted,var(--brand-muted,#99a0ae))] truncate">
            {token.balance} {token.symbol}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-[15px] font-semibold text-[var(--widget-fg,var(--brand-fg,#0e121b))] font-mono">
        {token.usdValue}
      </span>
    </button>
  );
}

function SwapGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 4h8m0 0L9 2m2 2L9 6M11 10H3m0 0l2-2m-2 2l2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
