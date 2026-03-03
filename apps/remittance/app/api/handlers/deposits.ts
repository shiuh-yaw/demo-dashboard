/**
 * Card deposits API handlers.
 * Tracks total deposits on user metadata; card balance = sum of deposits (starts at 0).
 */

import {
  getUser,
  updateUserMetadata,
  CARD_DEPOSITS_METADATA_KEY,
  SAVE_DEPOSITS_METADATA_KEY,
} from "@/lib/dynamic-api";
import {
  getCardDepositsFromUser,
  getSaveDepositsFromUser,
} from "@/lib/user-metadata";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const addDepositSchema = z.object({
  amount: z.number().positive("Amount must be positive").finite(),
});

export async function handleAddDeposit(userId: string, body: unknown) {
  const parsed = addDepositSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new ValidationError(firstError?.message ?? "Invalid amount");
  }
  const { amount } = parsed.data;

  const user = await getUser(userId);
  const current = getCardDepositsFromUser(user, CARD_DEPOSITS_METADATA_KEY);
  const newTotal = Math.round((current + amount) * 100) / 100;

  await updateUserMetadata(userId, {
    [CARD_DEPOSITS_METADATA_KEY]: newTotal,
  });

  return { success: true, cardBalance: newTotal };
}

/**
 * Get current card balance (total deposits) for the user.
 */
export async function handleGetCardBalance(userId: string) {
  const user = await getUser(userId);
  const cardBalance = getCardDepositsFromUser(user, CARD_DEPOSITS_METADATA_KEY);
  return { cardBalance };
}

/**
 * Reset card deposits (balance) to 0.
 */
export async function handleResetCardDeposits(userId: string) {
  await updateUserMetadata(userId, {
    [CARD_DEPOSITS_METADATA_KEY]: 0,
  });
  return { success: true, cardBalance: 0 };
}

/**
 * Save deposits API handler.
 * Tracks total save deposits on user metadata (additive only).
 */
export async function handleAddSaveDeposit(userId: string, body: unknown) {
  const parsed = addDepositSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new ValidationError(firstError?.message ?? "Invalid amount");
  }
  const { amount } = parsed.data;

  const user = await getUser(userId);
  const current = getSaveDepositsFromUser(user, SAVE_DEPOSITS_METADATA_KEY);
  const newTotal = Math.round((current + amount) * 100) / 100;

  await updateUserMetadata(userId, {
    [SAVE_DEPOSITS_METADATA_KEY]: newTotal,
  });

  return { success: true, saveDepositsTotal: newTotal };
}

/**
 * Reset save deposits to 0.
 */
export async function handleResetSaveDeposits(userId: string) {
  await updateUserMetadata(userId, {
    [SAVE_DEPOSITS_METADATA_KEY]: 0,
  });
  return { success: true, saveDepositsTotal: 0 };
}
