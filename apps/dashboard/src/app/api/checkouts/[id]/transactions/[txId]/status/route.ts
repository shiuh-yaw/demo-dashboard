/**
 * Transaction Status API
 *
 * GET /api/checkouts/[id]/transactions/[txId]/status - Get transaction status (public)
 * PATCH /api/checkouts/[id]/transactions/[txId]/status - Update transaction status
 *
 * GET is public to allow server-side status checks without requiring user authentication.
 * The checkout ID and transaction ID are obfuscated and not easily guessable.
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetTransactionStatus } from "../../../../handlers/get-transaction-status";
import { handleUpdateTransactionStatus } from "../../../../handlers/update-transaction-status";
import { NextRequest } from "next/server";
import type { TransactionParams } from "../../../types";

export const OPTIONS = corsOptions;

/**
 * GET /api/checkouts/[id]/transactions/[txId]/status
 * Get transaction status (public, no auth)
 *
 * This endpoint is public to allow checking transaction status without authentication.
 * The checkout ID and transaction ID are obfuscated and not easily guessable, providing sufficient security.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: TransactionParams }
) {
  try {
    const { id: checkoutId, txId } = await params;

    const result = await handleGetTransactionStatus({ checkoutId, txId });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "checkouts/transactions/status/get");
  }
}

export const PATCH = withAuth(
  async (request, { params }: { params: TransactionParams }) => {
    try {
      const { id: checkoutId, txId } = await params;
      const body = await request.json();

      const result = await handleUpdateTransactionStatus({
        checkoutId,
        txId,
        status: body.status,
        errorMessage: body.errorMessage,
      });

      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/status/update");
    }
  }
);
