/**
 * Single Transaction API
 *
 * GET /api/checkouts/[id]/transactions/[txId] - Get transaction details
 * PATCH /api/checkouts/[id]/transactions/[txId] - Update transaction (add route data)
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetTransaction } from "../../../handlers/get-transaction";
import { handleUpdateTransaction } from "../../../handlers/update-transaction";
import type { TransactionParams } from "../../types";

export const OPTIONS = corsOptions;

export const GET = withAuth(
  async (_request, { params }: { params: TransactionParams }) => {
    try {
      const { id: checkoutId, txId } = await params;

      const result = await handleGetTransaction({ checkoutId, txId });
      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/get");
    }
  }
);

export const PATCH = withAuth(
  async (request, { params }: { params: TransactionParams }) => {
    try {
      const { id: checkoutId, txId } = await params;
      const body = await request.json();

      const result = await handleUpdateTransaction({
        checkoutId,
        txId,
        walletAddress: body.walletAddress,
        fromChainId: body.fromChainId,
        toChainId: body.toChainId,
        fromToken: body.fromToken,
        toToken: body.toToken,
        fromAmount: body.fromAmount,
        toAmount: body.toAmount,
        tool: body.tool,
      });

      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/update");
    }
  }
);
