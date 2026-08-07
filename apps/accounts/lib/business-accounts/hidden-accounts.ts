"use client";

/**
 * Which accounts this user hides from their list.
 *
 * Stored on their Dynamic user metadata, not in this browser. It was
 * `localStorage` first, which meant hiding an account and then clearing the
 * cache brought it back - a choice about the account behaving like a property
 * of the device.
 *
 * The metadata write needs the admin API token, which can edit any user in the
 * environment, so it stays on the server: these helpers call this app's own
 * route and send the session JWT, and the route acts only on the user that
 * token names. See `app/api/hidden-accounts/route.ts`.
 *
 * Hiding is presentation only. It is never an input to who may read or change
 * an account - the server decides that, and a hidden account is still fully
 * reachable by id.
 */

import { getClient } from "@/lib/dynamic/client";

const ENDPOINT = "/api/hidden-accounts";

/** The session's JWT, for the route to verify. */
function authHeader(): HeadersInit {
  const token = getClient()?.token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}` };
}

async function readBody(response: Response): Promise<string[]> {
  const data = (await response.json()) as {
    hidden?: unknown;
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `HTTP ${response.status}`,
    );
  }
  return Array.isArray(data.hidden)
    ? data.hidden.filter((id): id is string => typeof id === "string")
    : [];
}

export async function fetchHiddenAccounts(): Promise<string[]> {
  const response = await fetch(ENDPOINT, { headers: authHeader() });
  return readBody(response);
}

/**
 * Replace the stored list.
 *
 * Returns what the server kept, which may be shorter than what was sent - it
 * dedupes and caps - so the caller adopts the truth rather than its own hope.
 */
export async function saveHiddenAccounts(
  ids: readonly string[],
): Promise<string[]> {
  const response = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ hidden: ids }),
  });
  return readBody(response);
}

/** Pure add/remove, so the toggle is testable without a network. */
export function withHiddenAccount(
  hidden: readonly string[],
  businessAccountId: string,
  next: boolean,
): string[] {
  const without = hidden.filter((id) => id !== businessAccountId);
  return next ? [...without, businessAccountId] : without;
}
