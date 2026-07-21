/**
 * Best-effort absolute origin for the current request, for server actions
 * that need to build a full URL (e.g. minting a `/s/<token>` share link).
 * Vercel sets `x-forwarded-proto`/`host`; falls back to `https` + `host`.
 */

import { headers } from "next/headers";

export async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("host") ?? "localhost:4000";
  return `${proto}://${host}`;
}
