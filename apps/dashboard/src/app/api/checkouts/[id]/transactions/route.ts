/**
 * Checkout Transactions API
 *
 * POST /api/checkouts/[id]/transactions - Initialize a new transaction (public)
 * GET /api/checkouts/[id]/transactions - List transactions for a checkout
 *
 * POST is public to allow server-side transaction initialization/checking
 * without requiring user authentication. IDs are obfuscated and not easily guessable.
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleCreateTransaction } from "../../handlers/create-transaction";
import { handleListTransactions } from "../../handlers/list-transactions";
import type { TransactionStatus } from "@/lib/types/dashboard";
import { NextRequest } from "next/server";
import type { CheckoutParams } from "../types";

export const OPTIONS = corsOptions;

/**
 * POST /api/checkouts/[id]/transactions
 * Initialize a new transaction or get existing one by externalId (public, no auth)
 *
 * This endpoint is public to allow transaction initialization and checking without authentication.
 * The checkout ID and externalId are obfuscated and not easily guessable, providing sufficient security.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: CheckoutParams }
) {
  try {
    const { id: checkoutId } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await handleCreateTransaction({
      checkoutId,
      externalId: body.externalId,
      metadata: body.metadata,
    });

    return createResponse(result, result.created ? 201 : 200);
  } catch (error) {
    return handleApiError(error, "checkouts/transactions/create");
  }
}

export const GET = withAuth(
  async (request, { params }: { params: CheckoutParams }) => {
    try {
      const { id: checkoutId } = await params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
      const statusParam = url.searchParams.get("status");
      const walletAddress = url.searchParams.get("walletAddress") || undefined;
      const externalId = url.searchParams.get("externalId") || undefined;

      // Parse status filter (can be comma-separated)
      let status: TransactionStatus | TransactionStatus[] | undefined;
      if (statusParam) {
        const statuses = statusParam.split(",") as TransactionStatus[];
        status = statuses.length === 1 ? statuses[0] : statuses;
      }

      const result = await handleListTransactions({
        checkoutId,
        page,
        pageSize,
        status,
        walletAddress,
        externalId,
      });

      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/transactions/list");
    }
  }
);
