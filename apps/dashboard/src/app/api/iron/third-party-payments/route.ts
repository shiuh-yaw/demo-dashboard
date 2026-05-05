/**
 * Iron Finance Third Party Payments API Routes
 *
 * POST /api/iron/third-party-payments - Create a third-party payment
 * GET /api/iron/third-party-payments - List third-party payments
 *
 * Third-party payments enable businesses to manage payments on behalf of users.
 * Use case: A business can initiate payouts/payins for their customers without
 * requiring the customer to have a crypto wallet.
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type CreateThirdPartyPaymentRequest } from "@dynamic-demos/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const createThirdPartyPaymentSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  type: z.enum(["payin", "payout"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["USD", "EUR", "GBP", "BRL", "MXN"]),
  bank_account_id: z.string().uuid("Invalid bank account ID"),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/iron/third-party-payments
 * Create a third-party payment (payin or payout)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = createThirdPartyPaymentSchema.parse(body);

    const paymentRequest: CreateThirdPartyPaymentRequest = {
      customer_id: validated.customer_id,
      type: validated.type,
      amount: validated.amount,
      currency: validated.currency,
      bank_account_id: validated.bank_account_id,
      description: validated.description,
      metadata: validated.metadata,
    };

    const payment = await ironClient.createThirdPartyPayment(paymentRequest);

    return createResponse(payment, 201);
  } catch (error) {
    return handleApiError(error, "iron/third-party-payments/create");
  }
});

/**
 * GET /api/iron/third-party-payments
 * List third-party payments for a customer
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

    const result = await ironClient.listThirdPartyPayments(customer_id, limit, offset);

    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "iron/third-party-payments/list");
  }
});
