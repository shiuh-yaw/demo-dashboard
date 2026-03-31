import { getTokenStats } from "@dynamic-demos/coingecko";
import { env } from "@/lib/env";

export async function handleTokenStats(symbol: string) {
  const stats = await getTokenStats(symbol.toUpperCase(), {
    apiKey: env.COIN_GECKO_API_KEY,
  });
  if (!stats) {
    throw new Error("Token not found");
  }
  return stats;
}
