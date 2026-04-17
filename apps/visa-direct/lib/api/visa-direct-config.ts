/**
 * Visa Direct Config API Client
 *
 * Fetches Visa Direct configurations from the dashboard API.
 * Used server-side in the root layout when an x-visa-direct-config-id
 * header has been set by the middleware.
 */

import { env } from "@/lib/env";
import type { VisaDirectConfig } from "@/lib/visa-direct-config";

export interface StoredVisaDirectConfigResponse {
  id: string;
  name: string;
  config: VisaDirectConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a Visa Direct configuration by ID from the dashboard API.
 * Returns null on 404 or network/parse errors — the layout then falls back
 * to DEFAULT_VISA_DIRECT_CONFIG.
 */
export async function getVisaDirectConfig(
  id: string,
): Promise<StoredVisaDirectConfigResponse | null> {
  try {
    const response = await fetch(
      `${env.DASHBOARD_API_URL}/api/visa-direct/configs/${id}`,
      {
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      console.warn(
        `Visa Direct config ${id} unavailable (${response.status}). Using defaults. Is the dashboard API running at ${env.DASHBOARD_API_URL}?`,
      );
      return null;
    }

    const data = await response.json();

    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredVisaDirectConfigResponse })
        .data;
    }

    console.warn(
      `Unexpected response format for Visa Direct config ${id}:`,
      data,
    );
    return null;
  } catch (error) {
    console.warn(
      `Visa Direct config ${id} fetch failed (network/error). Using defaults:`,
      error,
    );
    return null;
  }
}
