/**
 * Deposit API Client (server-side).
 *
 * Fetches stored wallet configurations from the dashboard API. Deposit's
 * `flow_role` is `wallet` (per its AGENTS.md), so it consumes the same
 * `/api/wallets/[id]` endpoint as the wallet demo. This runs server-side
 * for SSR theme injection in `app/layout.tsx`.
 */

import { env } from "@/lib/env";
import type { WidgetConfig } from "@dynamic-demos/theme";

const DASHBOARD_API_URL = env.NEXT_PUBLIC_DASHBOARD_API_URL;

export interface StoredWalletConfig {
  id: string;
  name: string;
  description?: string;
  config: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a wallet configuration by ID. Returns `null` on 404, network error,
 * or any other non-2xx response — callers fall back to deposit's static
 * `--brand-*` defaults.
 */
export async function getWalletConfig(
  id: string,
): Promise<StoredWalletConfig | null> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/api/wallets/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) return null;

      try {
        const errorData = await response.json();
        const errorMessage =
          (errorData as { error?: string }).error ?? `HTTP ${response.status}`;
        console.error(`API error fetching wallet ${id}:`, errorMessage);
      } catch {
        console.error(`Failed to fetch wallet ${id}: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    // Dashboard wraps responses as { success: true, data: T }
    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredWalletConfig }).data;
    }

    console.error(`Unexpected response format for wallet ${id}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching wallet ${id}:`, error);
    return null;
  }
}
