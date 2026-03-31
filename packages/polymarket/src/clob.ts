/**
 * Polymarket CLOB API - price history
 *
 * @see https://docs.polymarket.com/api-reference/markets/get-prices-history
 */

const CLOB_API_BASE = "https://clob.polymarket.com";

export interface PricePoint {
  t: number;
  p: number;
}

export interface PricesHistoryResponse {
  history: PricePoint[];
}

export type PricesHistoryInterval =
  | "max"
  | "all"
  | "1m"
  | "1w"
  | "1d"
  | "6h"
  | "1h";

export interface GetPricesHistoryParams {
  /** Token ID (asset id) - from market.clobTokenIds / yesTokenId */
  tokenId: string;
  /** Time interval. Default "all" for full history */
  interval?: PricesHistoryInterval;
  startTs?: number;
  endTs?: number;
  fidelity?: number;
}

/** CLOB API returns empty for 1m and 1w; map to intervals that return data */
const INTERVAL_FALLBACK: Record<string, PricesHistoryInterval> = {
  "1m": "1d",
  "1w": "all",
};

export async function getPricesHistory(
  params: GetPricesHistoryParams,
): Promise<PricePoint[]> {
  const { tokenId, interval = "all", startTs, endTs, fidelity } = params;
  const effectiveInterval = INTERVAL_FALLBACK[interval] ?? interval;

  const searchParams = new URLSearchParams();
  searchParams.set("market", tokenId);
  searchParams.set("interval", effectiveInterval);
  if (startTs != null) searchParams.set("startTs", String(startTs));
  if (endTs != null) searchParams.set("endTs", String(endTs));
  if (fidelity != null) searchParams.set("fidelity", String(fidelity));

  const res = await fetch(
    `${CLOB_API_BASE}/prices-history?${searchParams.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polymarket CLOB error: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as PricesHistoryResponse;
  return data.history ?? [];
}

/**
 * Compute % change from start to end of history.
 * Returns null if insufficient data.
 */
export function computePriceChange(history: PricePoint[]): number | null {
  if (history.length < 2) return null;
  const start = history[0]!.p;
  const end = history[history.length - 1]!.p;
  if (start === 0) return null;
  return ((end - start) / start) * 100;
}
