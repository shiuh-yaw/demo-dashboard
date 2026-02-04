/**
 * BlindPay Payin Quote API Route
 *
 * POST /api/blindpay/payins/quote
 *
 * Creates a payin quote for converting fiat to stablecoins.
 * This is step 1 of the payin flow - get quote with banking details.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payins
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { blindpayClient, type PayinQuoteRequest } from "@/lib/services/blindpay";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const OPTIONS = corsOptions;

const payinQuoteSchema = z.object({
  blockchain_wallet_id: z.string().min(1, "Blockchain wallet ID is required"),
  currency_type: z.enum(["sender", "receiver"], {
    errorMap: () => ({ message: "currency_type must be 'sender' or 'receiver'" }),
  }),
  cover_fees: z.boolean().default(false),
  request_amount: z.number().positive("Amount must be positive"),
  payment_method: z.enum(["ach", "wire", "pix", "sepa"]).default("ach"),
  token: z.enum(["USDC", "USDT", "USDB"]),
});

/**
 * POST /api/blindpay/payins/quote
 * Create a payin quote
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = payinQuoteSchema.parse(body);

    // Convert amount to cents
    const amountInCents = Math.round(validated.request_amount * 100);

    const quoteRequest: PayinQuoteRequest = {
      blockchain_wallet_id: validated.blockchain_wallet_id,
      currency_type: validated.currency_type,
      cover_fees: validated.cover_fees,
      request_amount: amountInCents,
      payment_method: validated.payment_method,
      token: validated.token,
    };

    const quote = await blindpayClient.createPayinQuote(quoteRequest);

    return createResponse({
      payin_quote_id: quote.id || quote.payin_quote_id,
      request_amount: quote.request_amount / 100,
      receiver_amount: quote.receiver_amount ? quote.receiver_amount / 100 : undefined,
      fee: quote.fee ? quote.fee / 100 : undefined,
      token: quote.token,
      blindpay_bank_details: quote.blindpay_bank_details,
      memo_code: quote.memo_code,
      quote: quote,
    });
  } catch (error) {
    return handleApiError(error, "blindpay/payins/quote");
  }
});

