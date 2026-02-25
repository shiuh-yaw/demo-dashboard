/**
 * Iron Finance Offramp Quote API Route
 *
 * POST /api/iron/quotes/offramp - Get an offramp quote (crypto to fiat)
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type OfframpQuoteRequest } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const offrampQuoteSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  source_currency: z.enum(["USDC", "USDT", "USDB", "EURC"]),
  destination_currency: z.enum(["USD", "EUR", "GBP", "BRL", "MXN"]),
  source_amount: z.number().positive().optional(),
  destination_amount: z.number().positive().optional(),
  bank_account_id: z.string().uuid("Invalid bank account ID"),
  wallet_id: z.string().uuid("Invalid wallet ID"),
}).refine((data) => data.source_amount || data.destination_amount, {
  message: "Either source_amount or destination_amount must be provided",
});

/**
 * POST /api/iron/quotes/offramp
 * Get a quote for converting crypto to fiat
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = offrampQuoteSchema.parse(body);

    const quoteRequest: OfframpQuoteRequest = {
      customer_id: validated.customer_id,
      source_currency: validated.source_currency,
      destination_currency: validated.destination_currency,
      source_amount: validated.source_amount,
      destination_amount: validated.destination_amount,
      bank_account_id: validated.bank_account_id,
      wallet_id: validated.wallet_id,
    };

    const quote = await ironClient.getOfframpQuote(quoteRequest);

    return createResponse(quote);
  } catch (error) {
    return handleApiError(error, "iron/quotes/offramp");
  }
});
