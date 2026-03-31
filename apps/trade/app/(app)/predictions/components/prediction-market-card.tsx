"use client";

/**
 * Prediction Market Card
 *
 * Betpulse-style card: icon, title, countdown, tags, Yes/No odds, volume, sparkline, action buttons.
 * Uses trade design tokens for light/dark theme compatibility.
 */

import Image from "next/image";
import { useState } from "react";
import { Clock } from "lucide-react";
import type { PolymarketMarketTransformed } from "@dynamic-demos/polymarket";
import { calculateTimeRemaining } from "@dynamic-demos/polymarket";

const TAG_STYLES: Record<string, string> = {
  trending: "bg-trade-error/15 text-trade-error border-trade-error/30",
  hot: "bg-trade-warning/15 text-trade-warning border-trade-warning/30",
  new: "bg-trade-accent/15 text-trade-accent border-trade-accent/30",
  "ending soon": "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "high stakes": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  "close call": "bg-trade-accent/15 text-trade-accent border-trade-accent/30",
};

function Sparkline({ yesPrice, noPrice }: { yesPrice: string; noPrice: string }) {
  const yes = parseFloat(yesPrice) / 100;
  const no = parseFloat(noPrice) / 100;
  const points = 20;
  const yesPoints: number[] = [];
  const noPoints: number[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    yesPoints.push(0.3 + yes * 0.5 + Math.sin(t * Math.PI * 2) * 0.15);
    noPoints.push(0.2 + no * 0.5 + Math.cos(t * Math.PI * 1.5) * 0.12);
  }
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => `${(i / points) * 100},${28 - v * 24}`)
      .join(" ");

  return (
    <div className="relative h-12 w-full min-w-0 flex-1">
      <svg
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 32"
      >
        <polyline
          fill="none"
          stroke="var(--color-trade-success)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={toPoints(yesPoints)}
        />
        <polyline
          fill="none"
          stroke="var(--color-trade-error)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={toPoints(noPoints)}
        />
      </svg>
    </div>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(0)}`;
}

interface PredictionMarketCardProps {
  market: PolymarketMarketTransformed;
}

export function PredictionMarketCard({ market }: PredictionMarketCardProps) {
  const [imgError, setImgError] = useState(false);
  const timeRemaining = calculateTimeRemaining(market.endDate);
  const displayVolume = formatVolume(market.volume);
  const yesPriceNum = parseFloat(market.yesPrice);
  const noPriceNum = parseFloat(market.noPrice);
  const showImage = market.imageUrl && !imgError;

  return (
    <div className="flex flex-col rounded-2xl border border-trade-border bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md hover:border-trade-border/80">
      {/* Header: icon + title + countdown */}
      <div className="flex gap-3 p-4">
        <div className="shrink-0 size-11 rounded-lg bg-trade-bg overflow-hidden relative">
          {showImage ? (
            <Image
              src={market.imageUrl}
              alt=""
              width={44}
              height={44}
              className="size-full object-cover"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="size-full bg-trade-border/50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-trade-text-primary line-clamp-2">
            {market.question}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-trade-text-muted">
            <Clock size={12} />
            <span className="text-xs font-medium">{timeRemaining}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {market.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {market.tags.slice(0, 3).map((tag) => {
            const style =
              TAG_STYLES[tag] ??
              "bg-trade-border/30 text-trade-text-secondary border-trade-border/50";
            return (
              <span
                key={tag}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${style}`}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Stats + Sparkline */}
      <div className="flex items-stretch gap-3 px-4 py-2 border-t border-trade-border/50">
        <div className="flex shrink-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-trade-success" />
            <span className="text-xs font-semibold text-trade-success">
              Yes {market.yesPrice}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-trade-error" />
            <span className="text-xs font-semibold text-trade-error">
              No {market.noPrice}%
            </span>
          </div>
          <span className="text-[10px] text-trade-text-muted">
            {displayVolume} Vol.
          </span>
        </div>
        <Sparkline yesPrice={market.yesPrice} noPrice={market.noPrice} />
      </div>

      {/* Yes/No buttons */}
      <div className="flex gap-1 p-3 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl py-3 text-center text-sm font-semibold transition-all bg-trade-success/15 text-trade-success border border-trade-success/30 hover:bg-trade-success/25"
        >
          Yes {yesPriceNum.toFixed(1)}¢
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl py-3 text-center text-sm font-semibold transition-all bg-trade-error/15 text-trade-error border border-trade-error/30 hover:bg-trade-error/25"
        >
          No {noPriceNum.toFixed(1)}¢
        </button>
      </div>
    </div>
  );
}
