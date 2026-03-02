/**
 * BlindPay Payin Status API Route
 *
 * GET /api/blindpay/payins/[id]
 *
 * Get the status of a payin transaction.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payins
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { blindpayClient } from "@/lib/services/blindpay";
import { NotFoundError } from "@/lib/errors";

export const OPTIONS = corsOptions;

type PayinParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/blindpay/payins/[id]
 * Get payin status
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: PayinParams) => {
    try {
      const { id } = await params;

      if (!id) {
        throw new NotFoundError("Payin ID is required");
      }

      const payin = await blindpayClient.getPayinStatus(id);

      return createResponse({
        payin_id: payin.id,
        status: payin.status,
        blindpay_bank_details: payin.blindpay_bank_details,
        memo_code: payin.memo_code,
        payin: payin,
      });
    } catch (error) {
      return handleApiError(error, "blindpay/payins/[id]");
    }
  }
);

