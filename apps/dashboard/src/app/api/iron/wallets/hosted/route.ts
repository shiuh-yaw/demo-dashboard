/**
 * Iron Finance Hosted Wallet API Route
 *
 * POST /api/iron/wallets/hosted - Register a hosted wallet
 *
 * Hosted wallets are managed by Iron (Iron holds the private keys).
 * Use this for customers who want a managed wallet solution.
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type RegisterHostedWalletRequest } from "@dynamic-demos/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const registerHostedWalletSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  blockchain: z.enum(["Ethereum", "Solana", "Polygon", "Arbitrum", "Base"]),
  address: z.string().min(1, "Wallet address is required"),
  signature: z.string().min(1, "Signature is required"),
  message: z.string().min(1, "Message is required"),
  label: z.string().optional(),
});

/**
 * POST /api/iron/wallets/hosted
 * Register a new hosted wallet for a customer
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = registerHostedWalletSchema.parse(body);

    const walletRequest: RegisterHostedWalletRequest = {
      customer_id: validated.customer_id,
      blockchain: validated.blockchain,
      address: validated.address,
      signature: validated.signature,
      message: validated.message,
      label: validated.label,
    };

    const wallet = await ironClient.registerHostedWallet(walletRequest);

    return createResponse(wallet, 201);
  } catch (error) {
    return handleApiError(error, "iron/wallets/hosted/create");
  }
});
