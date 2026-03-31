"use client";

/**
 * Prediction Event Card
 *
 * Matches Polymarket: event title, icon, multiple outcome rows with % and Yes/No buttons.
 * Click → event detail page with all markets.
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import type { PolymarketEventTransformed } from "@dynamic-demos/polymarket";
import { calculateTimeRemaining } from "@dynamic-demos/polymarket";

const TAG_STYLES: Record<string, string> = {
  trending: "bg-trade-error/15 text-trade-error border-trade-error/30",
  hot: "bg-trade-warning/15 text-trade-warning border-trade-warning/30",
  "high stakes": "bg-purple-500/15 text-purple-500 border-purple-500/30",
};

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(0)}`;
}

interface PredictionEventCardProps {
  event: PolymarketEventTransformed;
}

export function PredictionEventCard({ event }: PredictionEventCardProps) {
  const [imgError, setImgError] = useState(false);
  const displayVolume = formatVolume(event.volume);
  const timeRemaining = calculateTimeRemaining(event.endDate);
  const showImage = event.imageUrl && !imgError;

  const topMarkets = [...event.markets]
    .sort((a, b) => parseFloat(b.yesPrice) - parseFloat(a.yesPrice))
    .slice(0, 2);

  return (
    <Link
      href={`/predictions/${encodeURIComponent(event.slug)}`}
      className="flex h-full flex-col rounded-2xl border border-trade-border bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md hover:border-trade-accent/50 hover:bg-trade-surface/95"
    >
      {/* Header: icon + title + chevron (middle aligned) */}
      <div className="flex items-center gap-3 p-4">
        <div className="shrink-0 size-11 rounded-lg bg-trade-bg overflow-hidden relative">
          {showImage ? (
            <Image
              src={event.imageUrl}
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
          <h3 className="text-sm font-medium leading-snug text-trade-text-primary line-clamp-2 break-words">
            {event.title}
          </h3>
        </div>
        <ChevronRight className="shrink-0 size-5 text-trade-text-muted" />
      </div>

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {event.tags.slice(0, 3).map((tag) => {
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

      {/* Outcome rows: single market = large buttons, multi-market = compact rows */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-trade-border/50 divide-y divide-trade-border/50">
        {topMarkets.length === 1 ? (
          (() => {
            const m = topMarkets[0]!;
            return (
              <div key={m.id} className="flex flex-1 flex-col justify-center p-4">
                <div className="flex gap-2">
                  <span className="flex-1 rounded-xl py-3.5 text-center text-sm font-semibold bg-trade-success/15 text-trade-success border border-trade-success/30">
                    Yes {parseFloat(m.yesPrice).toFixed(1)}¢
                  </span>
                  <span className="flex-1 rounded-xl py-3.5 text-center text-sm font-semibold bg-trade-error/15 text-trade-error border border-trade-error/30">
                    No {parseFloat(m.noPrice).toFixed(1)}¢
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          topMarkets.map((market) => {
            const yesPct = parseFloat(market.yesPrice);
            const label = market.outcomeLabel ?? market.question;
            return (
              <div
                key={market.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm font-medium text-trade-text-primary truncate min-w-0">
                  {label}
                </span>
                <span className="text-sm font-semibold text-trade-text-secondary shrink-0">
                  {yesPct.toFixed(0)}%
                </span>
                <div className="flex gap-1 shrink-0">
                  <span className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-trade-success/15 text-trade-success border border-trade-success/30">
                    Yes
                  </span>
                  <span className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-trade-error/15 text-trade-error border border-trade-error/30">
                    No
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: volume + date */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-trade-border/50 bg-trade-bg/30">
        <span className="text-[10px] text-trade-text-muted">
          {displayVolume} Vol.
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-trade-text-muted">
          <Clock size={10} />
          <span>{timeRemaining}</span>
        </div>
      </div>
    </Link>
  );
}
