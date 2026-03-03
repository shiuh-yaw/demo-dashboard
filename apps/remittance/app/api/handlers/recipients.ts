/**
 * Recipients API Handlers
 *
 * Stores recipients as { email, address }[] so selecting a known recipient
 * does not require a resolve call.
 */

import {
  getUser,
  updateUserMetadata,
  createPregenWallet,
  KNOWN_RECIPIENTS_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getKnownRecipientsFromUser } from "@/lib/recipients";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

import type { RecipientEntry } from "@/lib/recipients";

const emailSchema = z
  .string()
  .email("Invalid email address")
  .transform((s) => s.trim().toLowerCase());

export async function handleGetRecipients(userId: string) {
  const user = await getUser(userId);
  const recipients = getKnownRecipientsFromUser(user);
  return { recipients };
}

export async function handleAddRecipient(userId: string, body: unknown) {
  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new ValidationError(firstError?.message ?? "Invalid email");
  }
  const email = parsed.data.email;

  const user = await getUser(userId);
  const existing = getKnownRecipientsFromUser(user);
  const found = existing.find((r) => r.email === email);
  if (found) {
    return { success: true, recipients: existing, address: found.address };
  }

  const wallet = await createPregenWallet({ type: "EVM", email });
  const newEntry: RecipientEntry = { email, address: wallet.address };
  const updated = [...existing, newEntry];
  await updateUserMetadata(userId, {
    [KNOWN_RECIPIENTS_METADATA_KEY]: updated,
  });
  return { success: true, recipients: updated, address: wallet.address };
}

export async function handleClearRecipients(userId: string) {
  await updateUserMetadata(userId, {
    [KNOWN_RECIPIENTS_METADATA_KEY]: [],
  });
  return { success: true };
}

export async function handleResolveRecipient(body: unknown) {
  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new ValidationError(firstError?.message ?? "Invalid email");
  }
  const email = parsed.data.email;

  const wallet = await createPregenWallet({
    type: "EVM",
    email,
  });
  return { address: wallet.address };
}
