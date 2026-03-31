import { getTokenMetadata } from "@dynamic-demos/coingecko";
import { env } from "@/lib/env";

export async function handleTokenMetadata(symbol: string) {
  return getTokenMetadata(symbol.toUpperCase(), {
    apiKey: env.COIN_GECKO_API_KEY,
  });
}
