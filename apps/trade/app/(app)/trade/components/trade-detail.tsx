"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { AssetHeader } from "./asset-header";
import { OrderCard } from "./order-card";
import { PriceChart } from "./price-chart";
import { TokenStats } from "./token-stats";
import { TokenAbout } from "./token-about";
import { useTradePrices } from "@/hooks/use-trade-prices";
import { useOHLC, type OHLCRange } from "@/hooks/use-ohlc";
import { useTokenMetadata } from "@/hooks/use-token-metadata";

function formatPrice(value: number | undefined): string {
  if (value == null) return "--";
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1)
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

interface TradeDetailProps {
  symbol: string;
}

export function TradeDetail({ symbol }: TradeDetailProps) {
  const selectedAsset = symbol.toUpperCase();
  const [chartRange, setChartRange] = useState<OHLCRange>("1D");
  const { resolvedTheme } = useTheme();

  const { data: prices } = useTradePrices();
  const {
    data: ohlc,
    isLoading: ohlcLoading,
    isError: ohlcError,
  } = useOHLC(selectedAsset, chartRange);
  const { data: metadata } = useTokenMetadata(selectedAsset);

  const firstPrice = ohlc?.length ? ohlc[0]!.close : null;
  const lastPrice = ohlc?.length ? ohlc[ohlc.length - 1]!.close : null;
  const change24h =
    firstPrice && lastPrice
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : null;
  const change24hDollar =
    firstPrice && lastPrice ? lastPrice - firstPrice : null;

  const [hovered, setHovered] = useState<{
    price: number;
    changePct: number;
    changeDollar: number;
  } | null>(null);

  const handleCrosshairMove = useCallback(
    (data: { price: number; time: number } | null) => {
      if (!data || firstPrice == null) {
        setHovered(null);
        return;
      }
      const changePct = ((data.price - firstPrice) / firstPrice) * 100;
      const changeDollar = data.price - firstPrice;
      setHovered({ price: data.price, changePct, changeDollar });
    },
    [firstPrice],
  );

  useEffect(() => {
    setHovered(null);
  }, [ohlc, chartRange]);

  const displayPrice = hovered?.price ?? lastPrice;
  const displayChangePct = hovered?.changePct ?? change24h;
  const displayChangeDollar = hovered?.changeDollar ?? change24hDollar;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: compact token identity above chart */}
      <AssetHeader
        symbol={selectedAsset}
        name={metadata?.name}
        logo={metadata?.logo}
      />

      {/* Chart + Order card: side by side on desktop, order card aligns with chart top */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_minmax(320px,400px)] lg:gap-4">
        <div className="flex flex-col gap-3 order-2 lg:order-1">
          {/* Chart card: price header + chart + timeframe selector */}
          <div className="rounded-2xl bg-trade-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {(displayPrice != null || displayChangePct != null) && (
              <div className="flex flex-col gap-0.5 mb-2">
                {displayPrice != null && (
                  <p className="text-2xl font-semibold text-trade-text-primary tabular-nums">
                    {formatPrice(displayPrice)}
                  </p>
                )}
                {(displayChangePct != null || displayChangeDollar != null) && (
                  <p
                    className={`text-sm tabular-nums ${
                      (displayChangePct != null && displayChangePct < 0) ||
                      (displayChangeDollar != null && displayChangeDollar < 0)
                        ? "text-trade-error"
                        : "text-trade-success"
                    }`}
                  >
                    {displayChangePct != null && displayChangePct < 0 && "↘ "}
                    {displayChangePct != null && displayChangePct >= 0 && "↗ "}
                    {displayChangeDollar != null &&
                      `$${Math.abs(displayChangeDollar).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )} `}
                    {displayChangePct != null &&
                      `(${displayChangePct >= 0 ? "+" : ""}${displayChangePct.toFixed(2)}%)`}
                  </p>
                )}
              </div>
            )}
            <div className="min-h-[300px] lg:min-h-[400px]">
              <PriceChart
                key={`${chartRange}-${resolvedTheme ?? "light"}`}
                data={ohlc ?? []}
                isLoading={ohlcLoading}
                error={ohlcError}
                range={chartRange}
                onRangeChange={setChartRange}
                onCrosshairMove={handleCrosshairMove}
              />
            </div>
          </div>

          <TokenStats symbol={selectedAsset} />

          <TokenAbout symbol={selectedAsset} />
        </div>

        <div className="order-1 lg:order-2">
          <OrderCard prices={prices ?? null} selectedSymbol={selectedAsset} />
        </div>
      </div>
    </div>
  );
}
