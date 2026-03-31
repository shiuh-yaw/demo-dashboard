/**
 * Trade Page (Server Component)
 *
 * - No symbol: list of top tokens by market cap (click to trade)
 * - With ?symbol=X: asset detail with chart and order card
 */

import { getMarketCoins } from "@dynamic-demos/coingecko";
import { env } from "@/lib/env";
import { MarketList } from "./components/market-list";
import { TradeDetail } from "./components/trade-detail";

interface PageProps {
  searchParams: Promise<{ symbol?: string }>;
}

export default async function TradePage({ searchParams }: PageProps) {
  const { symbol } = await searchParams;
  const symbolParam = symbol?.trim();

  if (!symbolParam) {
    // List view: top tokens by market cap
    let coins;
    try {
      coins = await getMarketCoins(
        { perPage: 25 },
        { apiKey: env.COIN_GECKO_API_KEY },
      );
    } catch {
      return (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold text-trade-text-primary">
              Tokens
            </h1>
            <p className="text-sm text-trade-text-secondary mt-0.5">
              Top tokens by market cap. Click to trade.
            </p>
          </div>
          <div className="rounded-2xl p-8 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <p className="text-trade-text-muted">Failed to load market data</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-trade-text-primary">Tokens</h1>
          <p className="text-sm text-trade-text-secondary mt-0.5">
            Top tokens by market cap. Click to trade.
          </p>
        </div>
        <MarketList coins={coins} />
      </div>
    );
  }

  // Detail view: chart + order card
  return <TradeDetail symbol={symbolParam} />;
}
