/**
 * Iron Finance Customer Bank Accounts API Route
 *
 * GET /api/iron/customers/[id]/banks - List bank accounts for a customer
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";

export const OPTIONS = corsOptions;

type CustomerParams = Promise<{ id: string }>;

/**
 * GET /api/iron/customers/[id]/banks
 * List all bank accounts for a customer
 */
export const GET = withAuth(
  async (_req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id: customer_id } = await params;
      const bankAccounts = await ironClient.listBankAccounts(customer_id);
      return createResponse(bankAccounts);
    } catch (error) {
      return handleApiError(error, "iron/customers/banks/list");
    }
  }
);
