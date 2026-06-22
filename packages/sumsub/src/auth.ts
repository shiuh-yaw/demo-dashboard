/**
 * SumSub API request signing (App Token authentication).
 *
 * Every request to api.sumsub.com must carry three headers:
 *   X-App-Token  — the app token verbatim
 *   X-App-Access-Ts — Unix epoch seconds (UTC), within ±60s of SumSub's clock
 *   X-App-Access-Sig — lowercase hex HMAC-SHA256 of the signing string
 *
 * Signing string (no separators):
 *   <ts><HTTP_METHOD_UPPER><path_with_query><body_bytes_or_empty>
 *
 * Reference: https://docs.sumsub.com/reference/authentication
 * Examples:  https://github.com/SumSubstance/AppTokenUsageExamples
 */

import { createHmac } from "node:crypto";

export interface SignedHeaders extends Record<string, string> {
  "X-App-Token": string;
  "X-App-Access-Ts": string;
  "X-App-Access-Sig": string;
  "Content-Type": string;
}

export function signRequest(
  appToken: string,
  secretKey: string,
  method: string,
  path: string,
  body?: string,
): SignedHeaders {
  const ts = Math.floor(Date.now() / 1000).toString();
  const signingString = `${ts}${method.toUpperCase()}${path}${body ?? ""}`;
  const sig = createHmac("sha256", secretKey)
    .update(signingString)
    .digest("hex");

  return {
    "X-App-Token": appToken,
    "X-App-Access-Ts": ts,
    "X-App-Access-Sig": sig,
    "Content-Type": "application/json",
  };
}
