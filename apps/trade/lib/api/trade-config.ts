/**
 * Trade Config API Client
 *
 * Fetches trade configurations from the dashboard API.
 * Used server-side in the root layout for theme when x-trade-config-id header is set.
 */

import { env } from "@/lib/env";
import type { TradeConfig } from "@/lib/trade-config";

export interface StoredTradeConfigResponse {
  id: string;
  name: string;
  config: TradeConfig;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a trade configuration by ID from the dashboard API
 */
export async function getTradeConfig(
  id: string,
): Promise<StoredTradeConfigResponse | null> {
  try {
    const response = await fetch(
      `${env.DASHBOARD_API_URL}/api/trade/configs/${id}`,
      {
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      console.warn(
        `Trade config ${id} unavailable (${response.status}). Using defaults. Is the dashboard API running at ${env.DASHBOARD_API_URL}?`,
      );
      return null;
    }

    const data = await response.json();

    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredTradeConfigResponse }).data;
    }

    console.warn(`Unexpected response format for trade config ${id}:`, data);
    return null;
  } catch (error) {
    console.warn(
      `Trade config ${id} fetch failed (network/error). Using defaults:`,
      error,
    );
    return null;
  }
}
