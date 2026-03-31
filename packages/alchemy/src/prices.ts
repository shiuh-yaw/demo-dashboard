/**
 * Alchemy Prices API
 *
 * Token price data for current and historical prices.
 * @see https://www.alchemy.com/docs/data/prices-api
 */

const PRICES_BASE = "https://api.g.alchemy.com/prices/v1";

export interface GetTokenPricesBySymbolParams {
  /** Token symbols (e.g. ETH, BTC). Max 25. */
  symbols: string[];
  apiKey: string;
}

export interface GetHistoricalTokenPricesParams {
  symbol: string;
  startTime: string;
  endTime: string;
  interval?: "5m" | "1h" | "1d";
  withMarketData?: boolean;
  apiKey: string;
}

/**
 * Fetch current token prices by symbol.
 * GET /prices/v1/{apiKey}/tokens/by-symbol?symbols=ETH,BTC
 */
export async function getTokenPricesBySymbol(
  params: GetTokenPricesBySymbolParams,
): Promise<unknown> {
  const { symbols, apiKey } = params;
  const searchParams = new URLSearchParams();
  symbols.forEach((s) => searchParams.append("symbols", s));

  const url = `${PRICES_BASE}/${apiKey}/tokens/by-symbol?${searchParams.toString()}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Alchemy prices API error: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Fetch historical token prices.
 * POST /prices/v1/{apiKey}/tokens/historical
 */
export async function getHistoricalTokenPrices(
  params: GetHistoricalTokenPricesParams,
): Promise<unknown> {
  const {
    symbol,
    startTime,
    endTime,
    interval = "1h",
    withMarketData = false,
    apiKey,
  } = params;

  const url = `${PRICES_BASE}/${apiKey}/tokens/historical`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      startTime,
      endTime,
      interval,
      withMarketData,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Alchemy historical prices API error: ${res.status} ${err}`,
    );
  }

  return res.json();
}
