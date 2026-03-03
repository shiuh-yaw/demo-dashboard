/**
 * Admin Fund/Release Transfer Handlers
 */

import { getFireblocksClient } from "@/lib/fireblocks";
import {
  createTransactionRequestSchema,
  type CreateTransactionRequest,
} from "@dynamic-demos/fireblocks";
import { ValidationError } from "@/lib/errors";

export async function handleFundTransfer(body: unknown) {
  const parsed = createTransactionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed");
  }

  const client = getFireblocksClient();
  const tx = await client.createTransaction(parsed.data);
  return tx;
}

export async function handleReleaseTransfer(body: unknown) {
  const parsed = createTransactionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed");
  }

  const data = parsed.data as CreateTransactionRequest;
  if (data.destination.type !== "ONE_TIME_ADDRESS") {
    throw new ValidationError("Release requires ONE_TIME_ADDRESS destination");
  }

  const client = getFireblocksClient();
  const tx = await client.createTransaction(data);
  return tx;
}
