/**
 * BlindPay Payout Status API Route
 *
 * GET /api/blindpay/payouts/[id]
 *
 * Get the status of a payout transaction.
 *
 * Reference: https://www.blindpay.com/docs/essentials/payouts
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { blindpayClient } from "@/lib/services/blindpay";
import { NotFoundError } from "@/lib/errors";

export const OPTIONS = corsOptions;

type PayoutParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/blindpay/payouts/[id]
 * Get payout status
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: PayoutParams) => {
    try {
      const { id } = await params;

      if (!id) {
        throw new NotFoundError("Payout ID is required");
      }

      const payout = await blindpayClient.getPayoutStatus(id);

      return createResponse({
        payout_id: payout.id,
        status: payout.status,
        receiver_amount: payout.receiver_amount
          ? payout.receiver_amount / 100
          : undefined,
        estimated_completion_time: payout.estimated_completion_time,
        payout: payout,
      });
    } catch (error) {
      return handleApiError(error, "blindpay/payouts/[id]");
    }
  }
);
