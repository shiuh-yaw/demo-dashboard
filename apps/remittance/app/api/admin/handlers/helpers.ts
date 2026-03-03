/**
 * Reusable helpers for admin API handlers
 */

import { env } from "@/lib/env";
import { ValidationError, ServiceUnavailableError } from "@/lib/errors";

/** Require a string field from parsed JSON body */
export function requireString(
  body: Record<string, unknown>,
  key: string,
  message?: string,
): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(message ?? `${key} is required`);
  }
  return value.trim();
}

/** Require string, allow undefined (returns undefined if missing) */
export function optionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  if (value == null || value === "") return undefined;
  return typeof value === "string" ? value.trim() : undefined;
}

/** Get omnibus vault ID from env, throws if not configured */
export function requireOmnibusVaultId(): string {
  const id = env.FIREBLOCKS_OMNIBUS_VAULT_ID;
  if (!id) {
    throw new ServiceUnavailableError(
      "FIREBLOCKS_OMNIBUS_VAULT_ID not configured",
    );
  }
  return id;
}

/** Get default asset ID from env, throws if not configured */
export function requireAssetId(): string {
  const id = env.FIREBLOCKS_DEFAULT_ASSET_ID;
  if (!id) {
    throw new ServiceUnavailableError(
      "Default asset not configured. Set FIREBLOCKS_DEFAULT_ASSET_ID in .env",
    );
  }
  return id;
}
