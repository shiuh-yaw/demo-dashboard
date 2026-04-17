"use client";

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * Get the current user's JWT for authenticated API calls.
 * Waits for client initialization if needed.
 */
export async function getAuthToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  await sdkWaitForClientInitialized(client);
  return (client as { token?: string | null }).token ?? null;
}

/**
 * Decode the Dynamic JWT and extract the user's name.
 * Google SSO populates `given_name`, `family_name`, and `name`.
 * Email OTP only has `email`, so we fall back to graceful undefined.
 */
export async function getUserName(): Promise<{ firstName: string; lastName: string } | undefined> {
  try {
    const token = await getAuthToken();
    if (!token) return undefined;
    const payload = JSON.parse(atob(token.split(".")[1]!)) as Record<string, unknown>;

    const given = typeof payload.given_name === "string" ? payload.given_name : undefined;
    const family = typeof payload.family_name === "string" ? payload.family_name : undefined;
    if (given !== undefined || family !== undefined) {
      return { firstName: given ?? "", lastName: family ?? "" };
    }

    const name = typeof payload.name === "string" ? payload.name : undefined;
    if (name) {
      const [first, ...rest] = name.split(" ");
      return { firstName: first ?? "", lastName: rest.join(" ") };
    }

    return undefined;
  } catch {
    return undefined;
  }
}
