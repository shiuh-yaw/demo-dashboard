/**
 * Iron Finance Wallet by ID API Route
 *
 * GET /api/iron/wallets/[id] - Get wallet by ID
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";

export const OPTIONS = corsOptions;

type WalletParams = Promise<{ id: string }>;

/**
 * GET /api/iron/wallets/[id]
 * Get a wallet by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: WalletParams }) => {
    try {
      const { id } = await params;
      const wallet = await ironClient.getWallet(id);
      return createResponse(wallet, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/wallets/get", req);
    }
  }
);
