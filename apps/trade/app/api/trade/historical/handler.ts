import { z } from "zod";
import { getHistoricalTokenPrices } from "@dynamic-demos/alchemy";
import { env } from "@/lib/env";

export const HistoricalPricesSchema = z.object({
  symbol: z.string().default("ETH"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  interval: z.enum(["5m", "1h", "1d"]).default("1h"),
  withMarketData: z.boolean().default(false),
});

export type HistoricalPricesParams = z.infer<typeof HistoricalPricesSchema>;

export async function handleHistoricalPrices(
  params: HistoricalPricesParams,
): Promise<unknown> {
  const { symbol, startTime, endTime, interval, withMarketData } = params;

  return getHistoricalTokenPrices({
    symbol,
    startTime,
    endTime,
    interval,
    withMarketData,
    apiKey: env.ALCHEMY_API_KEY,
  });
}
