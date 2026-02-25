/**
 * Iron Finance Onramps API Routes
 *
 * POST /api/iron/onramps - Create an onramp transaction
 * GET /api/iron/onramps - List onramps
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type CreateOnrampRequest } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const createOnrampSchema = z.object({
  quote_id: z.string().uuid("Invalid quote ID"),
  customer_id: z.string().uuid("Invalid customer ID"),
  wallet_id: z.string().uuid("Invalid wallet ID"),
  bank_account_id: z.string().uuid().optional(),
});

/**
 * POST /api/iron/onramps
 * Create an onramp transaction (fiat to crypto)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = createOnrampSchema.parse(body);

    const onrampRequest: CreateOnrampRequest = {
      quote_id: validated.quote_id,
      customer_id: validated.customer_id,
      wallet_id: validated.wallet_id,
      bank_account_id: validated.bank_account_id,
    };

    const onramp = await ironClient.createOnramp(onrampRequest);

    return createResponse(onramp, 201);
  } catch (error) {
    return handleApiError(error, "iron/onramps/create");
  }
});

/**
 * GET /api/iron/onramps
 * List onramps for a customer
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

    const result = await ironClient.listOnramps(customer_id, limit, offset);

    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "iron/onramps/list");
  }
});
