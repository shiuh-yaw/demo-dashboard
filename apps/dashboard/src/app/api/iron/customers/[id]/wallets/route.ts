/**
 * Iron Finance Customer Wallets API Route
 *
 * GET /api/iron/customers/[id]/wallets - List wallets for a customer
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getIronClient } from "@/lib/iron/client";

export const OPTIONS = corsOptions;

type CustomerParams = Promise<{ id: string }>;

/**
 * GET /api/iron/customers/[id]/wallets
 * List all wallets for a customer
 */
export const GET = withAuth(
  async (_req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id: customer_id } = await params;
      const wallets = await getIronClient().wallets.list(customer_id);
      return createResponse(wallets);
    } catch (error) {
      return handleApiError(error, "iron/customers/wallets/list");
    }
  }
);
