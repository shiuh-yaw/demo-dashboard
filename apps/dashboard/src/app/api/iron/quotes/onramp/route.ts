/**
 * Iron Finance Onramp Quote API Route
 *
 * POST /api/iron/quotes/onramp - Get an onramp quote (fiat to crypto)
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type OnrampQuoteRequest } from "@dynamic-demos/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const onrampQuoteSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  source_currency: z.enum(["USD", "EUR", "GBP", "BRL", "MXN"]),
  destination_currency: z.enum(["USDC", "USDT", "USDB", "EURC"]),
  source_amount: z.number().positive().optional(),
  destination_amount: z.number().positive().optional(),
  payment_rail: z.enum(["ach", "wire", "sepa", "pix", "faster_payments"]),
  wallet_address: z.string().min(1, "Wallet address is required"),
}).refine((data) => data.source_amount || data.destination_amount, {
  message: "Either source_amount or destination_amount must be provided",
});

/**
 * POST /api/iron/quotes/onramp
 * Get a quote for converting fiat to crypto
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = onrampQuoteSchema.parse(body);

    const quoteRequest: OnrampQuoteRequest = {
      customer_id: validated.customer_id,
      source_currency: validated.source_currency,
      destination_currency: validated.destination_currency,
      source_amount: validated.source_amount,
      destination_amount: validated.destination_amount,
      payment_rail: validated.payment_rail,
      wallet_address: validated.wallet_address,
    };

    const quote = await ironClient.getOnrampQuote(quoteRequest);

    return createResponse(quote);
  } catch (error) {
    return handleApiError(error, "iron/quotes/onramp");
  }
});
