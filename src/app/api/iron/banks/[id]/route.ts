/**
 * Iron Finance Bank Account by ID API Routes
 *
 * GET /api/iron/banks/[id] - Get bank account by ID
 * DELETE /api/iron/banks/[id] - Delete bank account
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";

export const OPTIONS = corsOptions;

type BankParams = Promise<{ id: string }>;

/**
 * GET /api/iron/banks/[id]
 * Get a bank account by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: BankParams }) => {
    try {
      const { id } = await params;
      const bankAccount = await ironClient.getBankAccount(id);
      return createResponse(bankAccount, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/banks/get", req);
    }
  }
);

/**
 * DELETE /api/iron/banks/[id]
 * Delete a bank account
 */
export const DELETE = withAuth(
  async (req: NextRequest, { params }: { params: BankParams }) => {
    try {
      const { id } = await params;
      const result = await ironClient.deleteBankAccount(id);
      return createResponse(result, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/banks/delete", req);
    }
  }
);
