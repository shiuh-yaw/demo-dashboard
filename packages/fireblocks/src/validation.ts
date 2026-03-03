/**
 * Fireblocks Zod Validation Schemas
 *
 * Runtime validation for Fireblocks transaction requests.
 */

import { z } from "zod";

const vaultAccountPeerPath = z.object({
  type: z.literal("VAULT_ACCOUNT"),
  id: z.string().min(1, "Vault account ID is required"),
  name: z.string().optional(),
});

const oneTimeAddressPeerPath = z.object({
  type: z.literal("ONE_TIME_ADDRESS"),
  address: z.string().min(1, "Address is required"),
  name: z.string().optional(),
});

const externalWalletPeerPath = z.object({
  type: z.literal("EXTERNAL_WALLET"),
  id: z.string().min(1, "External wallet ID is required"),
  name: z.string().optional(),
});

export const transferPeerPathSchema = z.discriminatedUnion("type", [
  vaultAccountPeerPath,
  oneTimeAddressPeerPath,
  externalWalletPeerPath,
]);

export const createTransactionRequestSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  source: transferPeerPathSchema,
  destination: transferPeerPathSchema,
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be a positive number"),
  note: z.string().optional(),
  customerRefId: z.string().optional(),
});

export type ValidatedTransferPeerPath = z.infer<typeof transferPeerPathSchema>;
export type ValidatedCreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;
