/**
 * Polymarket Gamma API client
 *
 * Fetches market data from Polymarket's Gamma API.
 * @see https://gamma-api.polymarket.com
 */

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

export async function polymarketFetch<T>(path: string): Promise<T> {
  const url = `${GAMMA_API_BASE}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Polymarket API error: ${res.status} - ${err}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  return res.json();
}
