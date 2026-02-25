/**
 * Iron Finance Self-Hosted Wallet API Route
 *
 * POST /api/iron/wallets/self-hosted - Register a self-hosted wallet
 *
 * Self-hosted wallets are managed by the user (user holds the private keys).
 * Requires signature proof of wallet ownership.
 *
 * Use the signature-example from https://github.com/ironxyz/signature-example
 * to generate the required signature and message.
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type RegisterSelfHostedWalletRequest } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const registerSelfHostedWalletSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  blockchain: z.enum(["ethereum", "solana", "polygon", "arbitrum", "base"]),
  wallet_address: z.string().min(1, "Wallet address is required"),
  signature: z.string().min(1, "Signature is required"),
  message: z.string().min(1, "Message is required"),
  label: z.string().optional(),
});

/**
 * POST /api/iron/wallets/self-hosted
 * Register a new self-hosted wallet for a customer
 *
 * Requires cryptographic signature proving ownership of the wallet
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = registerSelfHostedWalletSchema.parse(body);

    const walletRequest: RegisterSelfHostedWalletRequest = {
      customer_id: validated.customer_id,
      blockchain: validated.blockchain,
      wallet_address: validated.wallet_address,
      signature: validated.signature,
      message: validated.message,
      label: validated.label,
    };

    const wallet = await ironClient.registerSelfHostedWallet(walletRequest);

    return createResponse(wallet, 201);
  } catch (error) {
    return handleApiError(error, "iron/wallets/self-hosted/create");
  }
});
