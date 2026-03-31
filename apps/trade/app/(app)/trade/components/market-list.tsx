import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { MarketCoin } from "@dynamic-demos/coingecko";

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1)
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function formatCompact(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatChange(value: number | null | undefined): string {
  if (value == null) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function Sparkline({ prices }: { prices?: number[] }) {
  if (!prices?.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const isPositive = prices[prices.length - 1]! >= prices[0]!;

  return (
    <svg width="120" height="32" className="overflow-visible">
      <polyline
        fill="none"
        stroke={
          isPositive ? "var(--color-trade-success)" : "var(--color-trade-error)"
        }
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={prices
          .map((p, i) => {
            const x = (i / (prices.length - 1)) * 120;
            const y = 28 - ((p - min) / range) * 24;
            return `${x},${y}`;
          })
          .join(" ")}
      />
    </svg>
  );
}

interface MarketListProps {
  coins: MarketCoin[];
}

export function MarketList({ coins }: MarketListProps) {
  if (!coins.length) {
    return (
      <div className="rounded-2xl p-8 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <p className="text-trade-text-muted">No market data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-trade-border/50 bg-trade-bg/30">
              <th className="hidden md:table-cell text-left py-3 px-4 text-xs font-medium text-trade-text-muted">
                #
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-trade-text-muted">
                Token name
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                Price
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                1H
              </th>
              <th className="hidden md:table-cell text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                1D
              </th>
              <th className="hidden md:table-cell text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                FDV
              </th>
              <th className="hidden md:table-cell text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                Volume
              </th>
              <th className="hidden md:table-cell text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                1D chart
              </th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => {
              const change1h =
                coin.price_change_percentage_1h_in_currency ?? null;
              const change24h = coin.price_change_percentage_24h;
              const symbol = coin.symbol.toUpperCase();

              return (
                <tr
                  key={coin.id}
                  className="border-b border-trade-border/40 last:border-0 hover:bg-trade-surface-elevated transition-colors group cursor-pointer"
                >
                  <td className="hidden md:table-cell py-4 px-4 text-sm text-trade-text-muted">
                    {coin.market_cap_rank ?? "--"}
                  </td>
                  <td className="py-4 px-4">
                    <Link
                      href={`/trade?symbol=${symbol}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        width={32}
                        height={32}
                        className="rounded-full shrink-0"
                      />
                      <div>
                        <span className="font-medium text-trade-text-primary">
                          {coin.name}
                        </span>
                        <span className="block text-xs text-trade-text-muted">
                          {symbol}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-trade-text-primary tabular-nums">
                    {formatPrice(coin.current_price)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 text-sm tabular-nums ${
                        change1h != null
                          ? change1h >= 0
                            ? "text-trade-success"
                            : "text-trade-error"
                          : "text-trade-text-muted"
                      }`}
                    >
                      {change1h != null &&
                        (change1h >= 0 ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        ))}
                      {formatChange(change1h)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell py-4 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 text-sm tabular-nums ${
                        change24h != null
                          ? change24h >= 0
                            ? "text-trade-success"
                            : "text-trade-error"
                          : "text-trade-text-muted"
                      }`}
                    >
                      {change24h != null &&
                        (change24h >= 0 ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        ))}
                      {formatChange(change24h)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell py-4 px-4 text-right text-sm text-trade-text-secondary tabular-nums">
                    {formatCompact(coin.fully_diluted_valuation)}
                  </td>
                  <td className="hidden md:table-cell py-4 px-4 text-right text-sm text-trade-text-secondary tabular-nums">
                    {formatCompact(coin.total_volume)}
                  </td>
                  <td className="hidden md:table-cell py-4 px-4">
                    <Sparkline prices={coin.sparkline_in_7d?.price} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
