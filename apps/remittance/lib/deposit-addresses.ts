/**
 * Deterministic deposit addresses for Save and Card.
 * Used to distinguish deposits in transaction history.
 */

import { keccak256, toBytes } from "viem";

const SEED = "remittance:deposit:";

function getDeterministicAddress(slug: string): `0x${string}` {
  const hash = keccak256(toBytes(SEED + slug));
  // Hash is 32 bytes (64 hex chars), take last 20 bytes = 40 hex chars for address
  return `0x${hash.slice(-40)}` as `0x${string}`;
}

/** Deterministic address for Save deposits */
export const SAVE_ADDRESS = getDeterministicAddress("save");

/** Deterministic address for Card deposits */
export const CARD_ADDRESS = getDeterministicAddress("card");

/** Legacy burn address used by both Save and Card before deterministic addresses. */
const LEGACY_BURN_ADDRESS =
  "0x000000000000000000000000000000000000dead".toLowerCase();

export type DepositDestination = "save" | "card";

export type DestinationLabel = "Save" | "Card" | "Withdraw";

/**
 * Returns the display label for a deposit destination address, or null if unknown.
 * @param address - The counterparty address (To/From)
 * @param withdrawVaultAddress - Optional user's withdraw vault address; when matched, returns "Withdraw"
 */
export function getDepositDestinationLabel(
  address: string,
  withdrawVaultAddress?: string | null,
): DestinationLabel | "Burned" | null {
  const addr = address.toLowerCase();
  if (addr === SAVE_ADDRESS.toLowerCase()) return "Save";
  if (addr === CARD_ADDRESS.toLowerCase()) return "Card";
  if (addr === LEGACY_BURN_ADDRESS) return "Burned";
  if (withdrawVaultAddress && addr === withdrawVaultAddress.toLowerCase()) {
    return "Withdraw";
  }
  return null;
}

export interface CounterpartyLabelOptions {
  withdrawVaultAddress?: string | null;
  /** Map of lowercase address -> email for known recipients. */
  addressToEmail?: Record<string, string>;
}

/**
 * Returns the display label for a transaction counterparty address.
 * Priority: Save/Card/Withdraw > known recipient email > null (use truncateAddress).
 */
export function getCounterpartyDisplayLabel(
  address: string,
  options?: CounterpartyLabelOptions,
): string | null {
  const special = getDepositDestinationLabel(
    address,
    options?.withdrawVaultAddress,
  );
  if (special) return special;

  const email = options?.addressToEmail?.[address.toLowerCase()];
  return email ?? null;
}

/**
 * Build address -> email map from recipient entries for counterparty display.
 */
export function buildAddressToEmailMap(
  recipients: { email: string; address?: string }[],
): Record<string, string> {
  return recipients.reduce<Record<string, string>>((acc, r) => {
    if (r.address) acc[r.address.toLowerCase()] = r.email;
    return acc;
  }, {});
}
