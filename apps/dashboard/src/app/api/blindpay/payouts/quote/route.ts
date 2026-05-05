/**
 * BlindPay Payout Quote API Route
 *
 * POST /api/blindpay/payouts/quote
 *
 * Creates a payout quote for converting stablecoins to fiat.
 * This is step 1 of the payout flow - get quote before token approval.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payouts
 */

import { NextRequest } from "next/server";
import type { PayoutQuoteRequest } from "@dynamic-demos/blindpay";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getBlindpayClient } from "@/lib/blindpay/client";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const OPTIONS = corsOptions;

const payoutQuoteSchema = z.object({
  bank_account_id: z.string().length(15, "Bank account ID must be exactly 15 characters"),
  currency_type: z.enum(["sender", "receiver"], {
    errorMap: () => ({ message: "currency_type must be 'sender' or 'receiver'" }),
  }),
  cover_fees: z.boolean().default(false),
  request_amount: z.number().min(5, "Minimum payout amount is $5.00"),
  network: z.enum([
    "base_sepolia",
    "base",
    "ethereum",
    "arbitrum",
    "polygon",
    "stellar",
    "tron",
  ]),
  token: z.enum(["USDC", "USDT", "USDB"]),
  // Optional: wallet address can be passed from frontend if not in JWT
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address").optional(),
});

/**
 * POST /api/blindpay/payouts/quote
 * Create a payout quote
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = payoutQuoteSchema.parse(body);

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

    // Convert amount to cents
    const amountInCents = Math.round(validated.request_amount * 100);

    const quoteRequest: PayoutQuoteRequest = {
      bank_account_id: validated.bank_account_id,
      currency_type: validated.currency_type,
      cover_fees: validated.cover_fees,
      request_amount: amountInCents,
      network: validated.network,
      token: validated.token,
    };

    const quote = await getBlindpayClient().createPayoutQuote(quoteRequest);

    return createResponse({
      quote_id: quote.id || quote.quote_id,
      request_amount: quote.request_amount / 100,
      receiver_amount: quote.receiver_amount ? quote.receiver_amount / 100 : undefined,
      fee: quote.fee ? quote.fee / 100 : undefined,
      network: quote.network,
      token: quote.token,
      estimated_completion_time: quote.estimated_completion_time,
      quote: quote,
    });
  } catch (error) {
    return handleApiError(error, "blindpay/payouts/quote");
  }
});

