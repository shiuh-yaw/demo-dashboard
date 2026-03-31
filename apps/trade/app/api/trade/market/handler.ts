import { getMarketCoins } from "@dynamic-demos/coingecko";
import { env } from "@/lib/env";

export interface MarketParams {
  page?: number;
  perPage?: number;
  order?: string;
}

export async function handleMarketCoins(params?: MarketParams) {
  return getMarketCoins(
    {
      page: params?.page,
      perPage: params?.perPage,
      order: params?.order,
    },
    { apiKey: env.COIN_GECKO_API_KEY },
  );
}
