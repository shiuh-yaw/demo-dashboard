/**
 * Iron Finance Quote by ID API Route
 *
 * GET /api/iron/quotes/[id] - Get quote by ID
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";

export const OPTIONS = corsOptions;

type QuoteParams = Promise<{ id: string }>;

/**
 * GET /api/iron/quotes/[id]
 * Get a quote by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: QuoteParams }) => {
    try {
      const { id } = await params;
      const quote = await ironClient.getQuote(id);
      return createResponse(quote, 200);
    } catch (error) {
      return handleApiError(error, "iron/quotes/get");
    }
  }
);
