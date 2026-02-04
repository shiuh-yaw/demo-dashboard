/**
 * BlindPay Payin Execute API Route
 *
 * POST /api/blindpay/payins/execute
 *
 * Executes a payin after fiat deposit.
 * This is step 2 of the payin flow - execute after fiat is deposited.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payins
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { blindpayClient, type PayinExecuteRequest } from "@/lib/services/blindpay";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const OPTIONS = corsOptions;

const payinExecuteSchema = z.object({
  payin_quote_id: z.string().min(1, "Payin quote ID is required"),
});

/**
 * POST /api/blindpay/payins/execute
 * Execute a payin after fiat deposit
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = payinExecuteSchema.parse(body);

    const executeRequest: PayinExecuteRequest = {
      payin_quote_id: validated.payin_quote_id,
    };

    const payin = await blindpayClient.executePayin(executeRequest);

    return createResponse({
      payin_id: payin.id,
      status: payin.status,
      blindpay_bank_details: payin.blindpay_bank_details,
      memo_code: payin.memo_code,
      payin: payin,
    });
  } catch (error) {
    return handleApiError(error, "blindpay/payins/execute");
  }
});

