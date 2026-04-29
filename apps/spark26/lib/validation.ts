// Shared input validators for server-action and route entry points. Each
// server action accepts user-supplied strings that flow into Redis keys,
// URL templates, and external API calls — validate here at the boundary
// rather than relying on downstream systems to reject malformed input.

// Matches the regex used by the page-level confirmation lookup at
// `app/page.tsx`. Cvent confirmation numbers are short alphanumeric codes;
// anything that doesn't match isn't a real order.
const CONFIRMATION_REGEX = /^[A-Za-z0-9]{1,32}$/;

// Dynamic transaction IDs are UUIDs (verified from live API payloads).
// Validating lets us refuse path-traversal or query-string injection attempts
// before they ever reach Dynamic's backend.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertSafeConfirmation(value: string): string {
  if (typeof value !== "string" || !CONFIRMATION_REGEX.test(value)) {
    throw new Error("Invalid confirmation format");
  }
  return value;
}

export function assertSafeTransactionId(value: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error("Invalid transaction ID format");
  }
  return value;
}

// Caps client-supplied display metadata (sourceChain, sourceAsset) before it
// gets persisted to Redis and rendered back on the confirmation view. Strips
// ASCII control characters; truncates to a conservative bound.
export function sanitizeDisplayString(
  value: string | undefined,
  maxLength = 64,
): string | undefined {
  if (typeof value !== "string") return undefined;
  let cleaned = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const isControl = code < 32 || code === 127;
    if (!isControl) cleaned += value[i];
  }
  cleaned = cleaned.trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}
