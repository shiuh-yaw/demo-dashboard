import { getTokenPricesBySymbol } from "@dynamic-demos/alchemy";
import { env } from "@/lib/env";

const SYMBOLS = ["ETH", "BTC", "SOL", "MATIC", "ARB"];

export async function handleTokenPrices(): Promise<unknown> {
  return getTokenPricesBySymbol({
    symbols: SYMBOLS,
    apiKey: env.ALCHEMY_API_KEY,
  });
}
