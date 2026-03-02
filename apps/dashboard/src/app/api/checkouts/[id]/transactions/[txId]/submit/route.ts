/**
 * Transaction Submit API
 *
 * POST /api/checkouts/[id]/transactions/[txId]/submit - Submit transaction with txHash
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleSubmitTransaction } from "../../../../handlers/submit-transaction";
import type { TransactionParams } from "../../../types";

export const OPTIONS = corsOptions;

export const POST = withAuth(
  async (request, { params }: { params: TransactionParams }) => {
    try {
      const { id: checkoutId, txId } = await params;
      const body = await request.json();

      const result = await handleSubmitTransaction({
        checkoutId,
        txId,
        txHash: body.txHash,
      });

      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/submit");
    }
  }
);
