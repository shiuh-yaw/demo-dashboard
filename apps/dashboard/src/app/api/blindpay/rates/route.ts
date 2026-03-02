/**
 * BlindPay Rates API Route
 *
 * GET /api/blindpay/rates
 *
 * Get exchange rates for converting between currencies.
 * Returns FX quote if available, otherwise falls back to full quote if bank account provided.
 *
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { blindpayClient, type RatesRequest } from "@/lib/services/blindpay";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const OPTIONS = corsOptions;

const ratesQuerySchema = z.object({
  from: z.enum(["USDC", "USDT", "USDB"]),
  to: z.enum(["USDC", "USDT", "USDB", "USD", "BRL", "MXN", "COP", "ARS"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency_type: z.enum(["sender", "receiver"], {
    errorMap: () => ({
      message: "currency_type must be 'sender' or 'receiver'",
    }),
  }),
  bank_account_id: z.string().optional(),
  network: z
    .enum([
      "base_sepolia",
      "base",
      "ethereum",
      "arbitrum",
      "polygon",
      "stellar",
      "tron",
    ])
    .optional(),
  cover_fees: z.coerce.boolean().optional().default(false),
});

/**
 * GET /api/blindpay/rates
 * Get exchange rates
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const validated = ratesQuerySchema.parse({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      amount: searchParams.get("amount") || "1000",
      currency_type: searchParams.get("currency_type"),
      bank_account_id: searchParams.get("bank_account_id"),
      network: searchParams.get("network"),
      cover_fees: searchParams.get("cover_fees"),
    });

    if (!validated.from || !validated.to) {
      throw new ValidationError("from and to currencies are required");
    }

    const ratesRequest: RatesRequest = {
      from: validated.from,
      to: validated.to as RatesRequest["to"],
      amount: validated.amount,
      currency_type: validated.currency_type,
      bank_account_id: validated.bank_account_id,
      network: validated.network,
      cover_fees: validated.cover_fees,
    };

    const rates = await blindpayClient.getRates(ratesRequest);

    return createResponse(rates);
  } catch (error) {
    return handleApiError(error, "blindpay/rates");
  }
});
