/**
 * Stub card API handlers.
 * Creates a stablecoin debit card stored in Dynamic user metadata.
 */

import { faker } from "@faker-js/faker";
import {
  updateUserMetadata,
  removeUserMetadataKey,
  STUB_CARD_METADATA_KEY,
} from "@/lib/dynamic-api";

/**
 * Remove stub card metadata from user. User can create a new card afterward.
 */
export async function handleResetStubCard(userId: string) {
  await removeUserMetadataKey(userId, STUB_CARD_METADATA_KEY);
  return { success: true };
}

/**
 * Generate a Luhn-valid card number and expiry, store in user metadata.
 */
export async function handleCreateStubCard(userId: string) {
  const cardNumber = faker.finance.creditCardNumber();
  const expiryDate = faker.date.future({ years: 4 });
  const expiry = `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`;

  await updateUserMetadata(userId, {
    [STUB_CARD_METADATA_KEY]: { cardNumber, expiry },
  });

  return { cardNumber, expiry };
}
