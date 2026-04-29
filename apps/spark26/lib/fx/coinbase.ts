const ENDPOINT = "https://api.coinbase.com/v2/exchange-rates";
const TIMEOUT_MS = 3000;

// Sanity band for EUR/USD. A rate of 0 (or absurdly high) means something
// upstream is broken or malicious — we'd rather fail the checkout than
// accept a 0 rate that turns `amountDueUsd` into 0 and lets an attacker
// close a Cvent invoice with a trivial USDC transfer.
const MIN_RATE = 0.5;
const MAX_RATE = 5.0;

type CoinbaseResponse = {
  data?: { currency?: string; rates?: Record<string, string> };
};

export async function fetchCoinbaseRate(base: string): Promise<number> {
  const url = `${ENDPOINT}?currency=${encodeURIComponent(base)}`;
  const res = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Coinbase exchange-rates failed: ${res.status}`);
  }
  const body = (await res.json()) as CoinbaseResponse;
  const raw = body?.data?.rates?.USD;
  if (raw === undefined || raw === null) {
    throw new Error(`Coinbase response missing rates.USD for ${base}`);
  }
  const rate = Number.parseFloat(raw);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Coinbase returned invalid rate for ${base}: ${raw}`);
  }
  if (rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(
      `Coinbase rate for ${base} out of band (${rate}, expected ${MIN_RATE}-${MAX_RATE})`,
    );
  }
  return rate;
}
