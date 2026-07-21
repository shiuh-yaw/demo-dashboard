/**
 * Client IP extraction + hashing for the ingest route. Raw IPs are never
 * persisted or logged - callers must hash immediately and let the raw
 * string fall out of scope inside the same function.
 */

import { createHash } from "node:crypto";

/** First `x-forwarded-for` hop, falling back to `x-real-ip`. Null if absent. */
export function extractClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}

/** `sha256(ip + salt)`, hex-encoded. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}
