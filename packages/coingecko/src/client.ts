/**
 * CoinGecko API client
 *
 * Shared fetch helper for CoinGecko Demo API.
 * @see https://www.coingecko.com/en/api/documentation
 */

const BASE_URL = "https://api.coingecko.com/api/v3";

export interface CoinGeckoOptions {
  /** Optional API key for higher rate limits (Demo API) */
  apiKey?: string;
}

function getHeaders(apiKey?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }
  return headers;
}

export async function coingeckoFetch<T>(
  path: string,
  options: CoinGeckoOptions = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: getHeaders(options.apiKey),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CoinGecko API error: ${res.status} ${err}`);
  }

  return res.json();
}

export async function coingeckoFetchOptional<T>(
  path: string,
  options: CoinGeckoOptions = {},
): Promise<T | null> {
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: getHeaders(options.apiKey),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
