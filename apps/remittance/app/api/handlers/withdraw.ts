/**
 * Withdraw API Handlers
 */

import { getFireblocksClient } from "@/lib/fireblocks";
import { getOrCreateDepositAddress } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import {
  getUser,
  updateUserMetadata,
  BANK_DETAILS_SUBMITTED_METADATA_KEY,
} from "@/lib/dynamic-api";
import { isMetadataTruthy } from "@/lib/user-metadata";
import { env } from "@/lib/env";
import { ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { z } from "zod";

const bankSubmitSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z
    .string()
    .length(9, "Routing number must be 9 digits")
    .regex(/^\d+$/, "Routing number must contain only digits"),
});

export async function handleGetWithdrawAddress(userId: string) {
  const assetId = env.FIREBLOCKS_DEFAULT_ASSET_ID;
  if (!assetId) {
    throw new ServiceUnavailableError(
      "Default asset not configured. Set FIREBLOCKS_DEFAULT_ASSET_ID in .env",
    );
  }
  const client = getFireblocksClient();
  const depositAddress = await getOrCreateDepositAddress(
    client,
    OFFRAMP_VAULT_PREFIX + userId,
    assetId,
  );
  return { address: depositAddress.address };
}

export async function handleGetBankStatus(userId: string) {
  const user = await getUser(userId);
  const hasSubmittedBankDetails = user
    ? isMetadataTruthy(user, BANK_DETAILS_SUBMITTED_METADATA_KEY)
    : false;
  return { hasSubmittedBankDetails };
}

export async function handleSubmitBankDetails(userId: string, body: unknown) {
  const parsed = bankSubmitSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new ValidationError(firstError?.message ?? "Invalid request");
  }
  await updateUserMetadata(userId, {
    [BANK_DETAILS_SUBMITTED_METADATA_KEY]: "true",
  });
  return { success: true };
}
