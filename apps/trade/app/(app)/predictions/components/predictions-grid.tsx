"use client";

/**
 * Predictions Grid
 *
 * Renders a grid of prediction EVENT cards (one per event, not per market).
 * Click an event card to see its markets.
 */

import { PredictionEventCard } from "./prediction-event-card";
import type { PolymarketEventTransformed } from "@dynamic-demos/polymarket";

interface PredictionsGridProps {
  events: PolymarketEventTransformed[];
  isLoading?: boolean;
}

export function PredictionsGrid({
  events,
  isLoading = false,
}: PredictionsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-trade-border bg-trade-surface p-4 animate-pulse"
          >
            <div className="flex gap-3">
              <div className="size-11 shrink-0 rounded-lg bg-trade-border/50" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-full rounded bg-trade-border/50" />
                <div className="h-3 w-24 rounded bg-trade-border/50" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 flex-1 rounded-xl bg-trade-border/50" />
              <div className="h-8 flex-1 rounded-xl bg-trade-border/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-trade-border bg-trade-surface p-12 text-center">
        <p className="text-trade-text-muted">No prediction events available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <PredictionEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
