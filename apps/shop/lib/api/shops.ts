/**
 * Shop API Client
 *
 * Fetches shop configurations from the dashboard API. Runs server-side
 * for SSR theme injection in `app/layout.tsx`.
 *
 * NOTE: The dashboard does not yet expose `/api/shops/[id]`. This helper
 * is forward-compatible: any HTTP failure (including 404) returns `null`
 * gracefully so the layout falls back to shop's static `--brand-*`
 * defaults. Wire up the dashboard endpoint in a follow-up phase.
 */

import { env } from "@/lib/env";
import type { WidgetConfig } from "@dynamic-demos/theme";

const DASHBOARD_API_URL = env.NEXT_PUBLIC_DASHBOARD_API_URL;

/**
 * Stored shop configuration (from dashboard API).
 *
 * Schema mirrors `StoredWalletConfig` so when the dashboard endpoint
 * lands it can reuse the existing widget config storage shape.
 */
export interface StoredShopConfig {
  id: string;
  name: string;
  description?: string;
  config: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a shop configuration by ID from the dashboard API.
 *
 * Always returns gracefully — never throws — so the layout renders even
 * when the dashboard is unreachable or the endpoint doesn't exist yet.
 */
export async function getShopConfig(
  id: string,
): Promise<StoredShopConfig | null> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/api/shops/${id}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;

      try {
        const errorData = await response.json();
        const errorMessage =
          (errorData as { error?: string }).error || `HTTP ${response.status}`;
        console.error(`API error fetching shop ${id}:`, errorMessage);
      } catch {
        console.error(`Failed to fetch shop ${id}: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredShopConfig }).data;
    }

    console.error(`Unexpected response format for shop ${id}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching shop ${id}:`, error);
    return null;
  }
}
