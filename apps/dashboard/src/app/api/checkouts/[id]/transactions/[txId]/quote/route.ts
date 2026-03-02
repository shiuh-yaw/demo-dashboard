/**
 * Transaction Quote API
 *
 * POST /api/checkouts/[id]/transactions/[txId]/quote
 * Fetches a quote from LI.FI and stores route data in the transaction atomically.
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetTransactionQuote } from "../../../../handlers/get-transaction-quote";
import type { TransactionParams } from "../../../types";

export const OPTIONS = corsOptions;

export const POST = withAuth(
  async (request, { params }: { params: TransactionParams }) => {
    try {
      const { id: checkoutId, txId } = await params;
      const body = await request.json();

      const result = await handleGetTransactionQuote({
        checkoutId,
        txId,
        ...body,
      });

      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/quote");
    }
  }
);
