/**
 * Remittance Config API Client
 *
 * Fetches remittance configurations from the dashboard API.
 * Used server-side in the root layout when ?theme= is present.
 */

import { env } from "@/lib/env";
import type { RemittanceConfig } from "@/lib/remittance-config";

const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL;

export interface StoredRemittanceConfig {
  id: string;
  name: string;
  description?: string;
  config: RemittanceConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a remittance configuration by ID from the dashboard API
 */
export async function getRemittanceConfig(
  id: string
): Promise<StoredRemittanceConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/remittance/${id}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Failed to fetch remittance config ${id}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredRemittanceConfig }).data;
    }

    console.error(`Unexpected response format for remittance config ${id}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching remittance config ${id}:`, error);
    return null;
  }
}
