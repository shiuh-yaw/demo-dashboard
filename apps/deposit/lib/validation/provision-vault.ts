/**
 * Zod schema for `POST /api/vault/provision` request body.
 *
 * `network` accepts any string and falls back to the env default when the
 * value is not a recognised {@link DepositNetwork}.
 */

import { z } from "zod";
import { env } from "@/lib/env";
import { type DepositNetwork, isDepositNetwork } from "@/lib/deposit-network";

function normalizeProvisionNetwork(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Falls back to `NEXT_PUBLIC_NETWORK` when the client sends an unrecognised value. */
function resolveDepositNetwork(requested: string): DepositNetwork {
  return isDepositNetwork(requested) ? requested : env.NEXT_PUBLIC_NETWORK;
}

export const provisionVaultBodySchema = z.object({
  embeddedWalletAddress: z
    .string({ required_error: "embeddedWalletAddress is required" })
    .trim()
    .min(1, "embeddedWalletAddress is required"),
  network: z
    .any()
    .transform(normalizeProvisionNetwork)
    .transform(resolveDepositNetwork),
});

export type ProvisionVaultBody = z.infer<typeof provisionVaultBodySchema>;
