import { timingSafeEqual } from "node:crypto";

// Constant-time string comparison for bearer-token auth on internal routes.
// Guards against character-by-character timing leaks that `===`/`!==` would
// expose under a sufficiently careful observer. Returns false when lengths
// differ (no useful timing oracle there — attacker can already read
// `Authorization` header length from the request).
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return timingSafeEqual(bufA, bufB);
}
