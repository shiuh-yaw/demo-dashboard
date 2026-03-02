/**
 * Iron Finance Offramps API Routes
 *
 * POST /api/iron/offramps - Create an offramp transaction
 * GET /api/iron/offramps - List offramps
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type CreateOfframpRequest } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const createOfframpSchema = z.object({
  quote_id: z.string().uuid("Invalid quote ID"),
  customer_id: z.string().uuid("Invalid customer ID"),
  bank_account_id: z.string().uuid("Invalid bank account ID"),
});

/**
 * POST /api/iron/offramps
 * Create an offramp transaction (crypto to fiat)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = createOfframpSchema.parse(body);

    const offrampRequest: CreateOfframpRequest = {
      quote_id: validated.quote_id,
      customer_id: validated.customer_id,
      bank_account_id: validated.bank_account_id,
    };

    const offramp = await ironClient.createOfframp(offrampRequest);

    return createResponse(offramp, 201);
  } catch (error) {
    return handleApiError(error, "iron/offramps/create");
  }
});

/**
 * GET /api/iron/offramps
 * List offramps for a customer
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const customer_id = url.searchParams.get("customer_id");
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : undefined;
    const offset = url.searchParams.get("offset")
      ? parseInt(url.searchParams.get("offset")!, 10)
      : undefined;

    if (!customer_id) {
      throw new Error("customer_id query parameter is required");
    }

    const result = await ironClient.listOfframps(customer_id, limit, offset);

    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "iron/offramps/list");
  }
});
