"use client";

/**
 * Exchange connector rows injected into the wallet picker's
 * `extrasAfter` slot. Each row renders the exchange logo + name
 * and fires `onSelect` on click.
 */

import { cn } from "@dynamic-demos/utils";
import type { ExchangeProvider } from "@/lib/exchanges/types";

interface ExchangeRowsProps {
  exchanges: ExchangeProvider[];
  onSelect: (exchange: ExchangeProvider) => void;
  connecting?: string | null;
}

export function ExchangeRows({
  exchanges,
  onSelect,
  connecting,
}: ExchangeRowsProps) {
  if (exchanges.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {exchanges.map((exchange) => {
        const isConnecting = connecting === exchange.key;
        const Icon = exchange.iconComponent;
        return (
          <button
            key={exchange.key}
            type="button"
            disabled={isConnecting}
            onClick={() => onSelect(exchange)}
            className={cn(
              "w-full h-[52px] flex items-center gap-3",
              "bg-[var(--brand-row-bg,#f6f8fa)] rounded-[var(--brand-radius,12px)]",
              "px-3 py-2",
              "transition-all duration-150",
              "hover:bg-[var(--brand-row-hover,#eef0f3)] active:opacity-80",
              "cursor-pointer",
              isConnecting && "opacity-60 pointer-events-none",
            )}
          >
            {Icon ? (
              <Icon className="w-8 h-8 shrink-0" />
            ) : exchange.iconUrl ? (
              <img
                src={exchange.iconUrl}
                alt=""
                className="w-8 h-8 shrink-0 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 shrink-0 rounded-full bg-[var(--brand-muted,#99a0ae)]/20" />
            )}
            <span className="text-sm font-medium text-[var(--brand-fg,#0e121b)] truncate">
              {exchange.name}
            </span>
            {isConnecting && (
              <div className="ml-auto w-4 h-4 border-2 border-[var(--brand-accent,#0050ff)] border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        );
      })}
    </div>
  );
}
