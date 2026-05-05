/**
 * BlindPay Payout Execute API Route
 *
 * POST /api/blindpay/payouts/execute
 *
 * Executes a payout after token approval.
 * This is step 2 of the payout flow - execute after user approves tokens.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payouts
 */

import { NextRequest } from "next/server";
import type { PayoutExecuteRequest } from "@dynamic-demos/blindpay";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getBlindpayClient } from "@/lib/blindpay/client";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const OPTIONS = corsOptions;

const payoutExecuteSchema = z.object({
  quote_id: z.string().min(1, "Quote ID is required"),
  approval_tx_hash: z.string().optional(), // Optional for tracking
  // Optional: wallet address can be passed from frontend if not in JWT
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address").optional(),
});

/**
 * POST /api/blindpay/payouts/execute
 * Execute a payout after token approval
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = payoutExecuteSchema.parse(body);

    // Get wallet address: prefer request body, fallback to JWT verified_credentials
    let walletAddress = validated.wallet_address;
    
    if (!walletAddress) {
      walletAddress = user.verified_credentials?.find(
        (cred) => cred.wallet_provider === "embeddedWallet"
      )?.address;
    }

    if (!walletAddress) {
      throw new ValidationError(
        "No wallet address found. Pass wallet_address in request body or ensure embedded wallet is in verified_credentials."
      );
    }

    const executeRequest: PayoutExecuteRequest = {
      quote_id: validated.quote_id,
      sender_wallet_address: walletAddress,
    };

    const payout = await getBlindpayClient().executePayout(executeRequest);

    return createResponse({
      payout_id: payout.id,
      status: payout.status,
      receiver_amount: payout.receiver_amount ? payout.receiver_amount / 100 : undefined,
      estimated_completion_time: payout.estimated_completion_time,
      approval_tx_hash: validated.approval_tx_hash,
      payout: payout,
    });
  } catch (error) {
    return handleApiError(error, "blindpay/payouts/execute");
  }
});

