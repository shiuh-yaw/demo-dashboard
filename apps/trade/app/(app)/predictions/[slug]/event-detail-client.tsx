"use client";

/**
 * Event Detail - Polymarket-style layout
 *
 * 2-column: Left = header, chart, market list | Right = trade card
 * @see https://polymarket.com/event/which-company-has-the-best-ai-model-end-of-march-751
 */

import Image from "next/image";
import { useState } from "react";
import type {
  PolymarketEventTransformed,
  PolymarketMarketTransformed,
} from "@dynamic-demos/polymarket";
import { ProbabilityTimeChart } from "./probability-time-chart";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockBalances } from "@/hooks/use-mock-balances";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import type { MockPredictPosition } from "@/lib/mock-metadata";

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(0)}`;
}

/** Polymarket-style: show "<1%" for values below 1 */
function formatPct(pct: string): string {
  const n = parseFloat(pct);
  if (Number.isNaN(n)) return "0%";
  return n < 1 && n > 0 ? "<1%" : `${n.toFixed(1)}%`;
}

function formatExpiry(endDate: string): string {
  const d = new Date(endDate);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface EventDetailClientProps {
  event: PolymarketEventTransformed;
}

function MarketRow({
  market,
  isSelected,
  activeSide,
  onSelect,
  onSideSelect,
}: {
  market: PolymarketMarketTransformed;
  isSelected: boolean;
  activeSide?: "yes" | "no";
  onSelect: () => void;
  onSideSelect?: (side: "yes" | "no") => void;
}) {
  const [imgError, setImgError] = useState(false);
  const yesPriceNum = parseFloat(market.yesPrice);
  const noPriceNum = parseFloat(market.noPrice);
  const label = market.outcomeLabel ?? market.question;
  const showImage = market.imageUrl && !imgError;
  const showActive = isSelected && activeSide != null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-trade-bg/50 ${
        isSelected ? "bg-trade-accent/10" : ""
      }`}
    >
      <div className="shrink-0 size-8 rounded-lg bg-trade-bg overflow-hidden">
        {showImage ? (
          <Image
            src={market.imageUrl}
            alt=""
            width={32}
            height={32}
            className="size-full object-cover"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="size-full bg-trade-border/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-trade-text-primary truncate">
          {label}
        </p>
        <p className="text-xs text-trade-text-muted">
          {formatVolume(market.volume)} Vol.
        </p>
      </div>
      <span className="shrink-0 w-14 text-right text-base font-bold tabular-nums text-trade-text-primary">
        {formatPct(market.yesPrice)}
      </span>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSideSelect?.("yes");
          }}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
            showActive && activeSide === "yes"
              ? "bg-trade-success/25 text-trade-success border-trade-success ring-2 ring-trade-success/50"
              : "bg-trade-success/15 text-trade-success border-trade-success/30 hover:bg-trade-success/20"
          }`}
        >
          Buy Yes {yesPriceNum.toFixed(1)}¢
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSideSelect?.("no");
          }}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
            showActive && activeSide === "no"
              ? "bg-trade-error/25 text-trade-error border-trade-error ring-2 ring-trade-error/50"
              : "bg-trade-error/15 text-trade-error border-trade-error/30 hover:bg-trade-error/20"
          }`}
        >
          Buy No {noPriceNum.toFixed(1)}¢
        </button>
      </div>
    </div>
  );
}

function TradeCard({
  event,
  market,
  side,
  onSideChange,
}: {
  event: PolymarketEventTransformed;
  market: PolymarketMarketTransformed;
  side: "yes" | "no";
  onSideChange: (side: "yes" | "no") => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const yesPriceNum = parseFloat(market.yesPrice);
  const noPriceNum = parseFloat(market.noPrice);
  const label = market.outcomeLabel ?? market.question;

  const { isMockMode } = useMockMode();
  const { metadata, updateMetadata } = useMockMetadata();
  const { getBalance, deductBalance } = useMockBalances();

  const usdcBalance = getBalance("USDC");

  const handleTrade = async () => {
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (amountNum > usdcBalance) {
      setError(
        `Insufficient balance. You have $${usdcBalance.toFixed(2)} USDC.`,
      );
      return;
    }
    setError(null);
    setIsPending(true);

    if (isMockMode) {
      try {
        const deducted = await deductBalance("USDC", amountNum);
        if (!deducted) {
          setError("Insufficient USDC balance");
          setIsPending(false);
          return;
        }
        const predict = (metadata[MOCK_METADATA_KEYS.PREDICT] ?? {}) as {
          positions?: MockPredictPosition[];
        };
        const positions = predict.positions ?? [];
        const price = side === "yes" ? market.yesPrice : market.noPrice;
        const existing = positions.find(
          (p) => p.marketId === market.id && p.side === side,
        );
        const updatedPositions = existing
          ? positions.map((p) =>
              p.marketId === market.id && p.side === side
                ? {
                    ...p,
                    amount: String(parseFloat(p.amount) + amountNum),
                    price,
                    marketQuestion: market.question,
                    eventSlug: event.slug,
                    eventTitle: event.title,
                    imageUrl: market.imageUrl || event.imageUrl || p.imageUrl,
                  }
                : p,
            )
          : [
              ...positions,
              {
                id: `predict-${market.id}-${Date.now()}`,
                marketId: market.id,
                marketQuestion: market.question,
                eventSlug: event.slug,
                eventTitle: event.title,
                side,
                amount: String(amountNum),
                price,
                placedAt: new Date().toISOString(),
                imageUrl: market.imageUrl || event.imageUrl || null,
              } as MockPredictPosition,
            ];
        await updateMetadata.mutateAsync({
          [MOCK_METADATA_KEYS.PREDICT]: { positions: updatedPositions },
        });
        setAmount("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Mock trade failed";
        const friendly =
          msg.includes("500") || msg.includes("Unexpected server error")
            ? "Unable to save. Try closing some positions or try again later."
            : msg.includes("exceeds")
              ? msg
              : msg;
        setError(friendly);
      } finally {
        setIsPending(false);
      }
      return;
    }

    // Real on-chain logic would go here
    setError("Trading is only available in mock mode");
    setIsPending(false);
  };

  const canTrade = isMockMode && amount && parseFloat(amount) > 0;

  return (
    <div className="rounded-2xl border border-trade-border bg-trade-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-lg bg-trade-bg overflow-hidden">
          {market.imageUrl ? (
            <Image
              src={market.imageUrl}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <div className="size-full bg-trade-border/50" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-trade-text-primary truncate">
            {label}
          </p>
          <p className="text-xs text-trade-text-muted">
            {formatVolume(market.volume)} Vol.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSideChange("yes")}
          className={`cursor-pointer flex-1 rounded-lg py-4 text-center text-sm font-semibold transition-all border ${
            side === "yes"
              ? "bg-trade-success/25 text-trade-success border-trade-success ring-2 ring-trade-success/50"
              : "bg-trade-success/15 text-trade-success border-trade-success/30 hover:bg-trade-success/20"
          }`}
        >
          Buy Yes {yesPriceNum.toFixed(1)}¢
        </button>
        <button
          type="button"
          onClick={() => onSideChange("no")}
          className={`cursor-pointer flex-1 rounded-lg py-4 text-center text-sm font-semibold transition-all border ${
            side === "no"
              ? "bg-trade-error/25 text-trade-error border-trade-error ring-2 ring-trade-error/50"
              : "bg-trade-error/15 text-trade-error border-trade-error/30 hover:bg-trade-error/20"
          }`}
        >
          Buy No {noPriceNum.toFixed(1)}¢
        </button>
      </div>
      {isMockMode && (
        <p className="mt-2 text-xs text-trade-text-muted">
          Available: $
          {usdcBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          USDC
        </p>
      )}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-medium text-trade-text-muted">
          Amount
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          className="w-full rounded-xl border border-trade-border bg-trade-bg px-4 py-3 text-sm text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
        />
      </div>
      {error && <p className="mt-2 text-xs text-trade-error">{error}</p>}
      <button
        type="button"
        onClick={handleTrade}
        disabled={!canTrade || isPending}
        className="cursor-pointer mt-4 w-full rounded-xl bg-trade-accent py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Trading…" : "Trade"}
      </button>
    </div>
  );
}

function EventPositionsCard({ event }: { event: PolymarketEventTransformed }) {
  const { isMockMode } = useMockMode();
  const { metadata, updateMetadata } = useMockMetadata();
  const { addBalance } = useMockBalances();
  const predict = (metadata[MOCK_METADATA_KEYS.PREDICT] ?? {}) as {
    positions?: MockPredictPosition[];
  };
  const allPositions = predict.positions ?? [];
  const positions = allPositions.filter((p) => p.eventSlug === event.slug);

  const handleClose = async (positionId: string) => {
    const pos = allPositions.find((p) => p.id === positionId);
    if (pos) {
      const amountNum = parseFloat(pos.amount);
      if (!Number.isNaN(amountNum) && amountNum > 0) {
        await addBalance("USDC", amountNum);
      }
    }
    const updatedPositions = allPositions.filter((p) => p.id !== positionId);
    await updateMetadata.mutateAsync({
      [MOCK_METADATA_KEYS.PREDICT]: { positions: updatedPositions },
    });
  };

  if (!isMockMode || positions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-trade-border bg-trade-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-trade-text-primary mb-3">
        Positions
      </h3>
      <div className="space-y-2">
        {positions.map((pos) => (
          <div
            key={pos.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-trade-border/50 bg-trade-bg/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-trade-text-primary line-clamp-2 leading-snug">
                {pos.marketQuestion}
              </p>
              <p className="mt-0.5 text-xs font-medium text-trade-text-secondary tabular-nums">
                {pos.side === "yes" ? "Yes" : "No"} · ${pos.amount}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`text-xs font-semibold ${
                  pos.side === "yes" ? "text-trade-success" : "text-trade-error"
                }`}
              >
                {pos.side === "yes" ? "Yes" : "No"}
              </span>
              <button
                type="button"
                onClick={() => handleClose(pos.id)}
                disabled={updateMetadata.isPending}
                className="cursor-pointer rounded-lg border border-trade-border/60 bg-trade-surface px-2.5 py-1 text-xs font-semibold text-trade-text-secondary transition-colors hover:border-trade-error/50 hover:bg-trade-error/10 hover:text-trade-error disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const [selectedMarket, setSelectedMarket] =
    useState<PolymarketMarketTransformed | null>(event.markets[0] ?? null);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const displayVolume = formatVolume(event.volume);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_minmax(320px,380px)] lg:gap-6">
      {/* Left: header, charts, market list */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-trade-border bg-trade-surface overflow-hidden">
          {/* Header: icon, title (middle-aligned), vol & time below */}
          <div className="flex items-center gap-4 p-6">
            {(event.imageUrl || event.markets[0]?.imageUrl) && (
              <div className="shrink-0 size-14 rounded-xl bg-trade-bg overflow-hidden">
                <Image
                  src={event.imageUrl || event.markets[0]?.imageUrl || ""}
                  alt=""
                  width={56}
                  height={56}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
              <h1 className="text-base font-bold text-trade-text-primary leading-snug">
                {event.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-trade-text-muted">
                <span>{displayVolume} Vol.</span>
                <span>·</span>
                <span>{formatExpiry(event.endDate)}</span>
              </div>
            </div>
          </div>

          {/* Time-series chart (when we have token IDs) */}
          {event.markets.some((m) => m.yesTokenId) && (
            <div className="border-t border-trade-border px-6 py-4">
              <ProbabilityTimeChart
                markets={event.markets}
                eventStartDate={event.startDate}
              />
            </div>
          )}

          {/* Market list - sorted by probability descending */}
          <div className="border-t border-trade-border divide-y divide-trade-border">
            {[...event.markets]
              .sort((a, b) => parseFloat(b.yesPrice) - parseFloat(a.yesPrice))
              .map((market) => (
                <MarketRow
                  key={market.id}
                  market={market}
                  isSelected={selectedMarket?.id === market.id}
                  activeSide={
                    selectedMarket?.id === market.id ? side : undefined
                  }
                  onSelect={() => {
                    setSelectedMarket(market);
                    setSide("yes");
                  }}
                  onSideSelect={
                    selectedMarket?.id === market.id ? setSide : undefined
                  }
                />
              ))}
          </div>
        </div>
      </div>

      {/* Right: trade card + positions */}
      <div className="lg:sticky lg:top-4 lg:self-start flex flex-col gap-4">
        {selectedMarket ? (
          <TradeCard
            event={event}
            market={selectedMarket}
            side={side}
            onSideChange={setSide}
          />
        ) : (
          <div className="rounded-2xl border border-trade-border bg-trade-surface p-6 text-center">
            <p className="text-sm text-trade-text-muted">
              Select a market to trade
            </p>
          </div>
        )}
        <EventPositionsCard event={event} />
      </div>
    </div>
  );
}
