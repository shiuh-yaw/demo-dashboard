/**
 * Generic helpers for reading Dynamic user metadata.
 * Keeps reusable across admin, API routes, etc.
 */

type UserWithMetadata = { metadata?: Record<string, unknown> };

/**
 * Get a metadata value as a non-empty string, or null.
 */
export function getMetadataString(
  user: UserWithMetadata,
  key: string,
): string | null {
  const v = user.metadata?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Check if a metadata key has a non-empty string value.
 */
export function hasMetadataString(
  user: UserWithMetadata,
  key: string,
): boolean {
  return getMetadataString(user, key) !== null;
}

/**
 * Check if a metadata value is truthy ("true" or boolean true).
 */
export function isMetadataTruthy(user: UserWithMetadata, key: string): boolean {
  const v = user.metadata?.[key];
  return v === "true" || v === true;
}

type UserWithWallets = {
  wallets?: Array<{ publicKey?: string }>;
};

/**
 * Get the primary (first) wallet address from a user.
 */
export function getPrimaryWalletAddress(user: UserWithWallets): string | null {
  const w = user.wallets?.[0];
  return w?.publicKey ?? null;
}

export interface StubCard {
  cardNumber: string;
  expiry?: string;
}

/**
 * Get stub debit card from user metadata.
 * Returns null if no card or invalid shape.
 */
export function getStubCardFromUser(
  user: UserWithMetadata,
  key: string,
): StubCard | null {
  const v = user.metadata?.[key];
  if (
    typeof v === "object" &&
    v !== null &&
    "cardNumber" in v &&
    typeof (v as { cardNumber: unknown }).cardNumber === "string"
  ) {
    const obj = v as { cardNumber: string; expiry?: string };
    return {
      cardNumber: obj.cardNumber,
      expiry: typeof obj.expiry === "string" ? obj.expiry : undefined,
    };
  }
  return null;
}

/**
 * Get total card deposits from user metadata.
 * Returns 0 if not set or invalid.
 */
export function getCardDepositsFromUser(
  user: UserWithMetadata | null,
  key: string,
): number {
  const v = user?.metadata?.[key];
  if (typeof v === "number" && !Number.isNaN(v) && v >= 0) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 0;
}

/**
 * Get total save deposits from user metadata.
 * Returns 0 if not set or invalid.
 */
export function getSaveDepositsFromUser(
  user: UserWithMetadata | null,
  key: string,
): number {
  return getCardDepositsFromUser(user, key);
}
