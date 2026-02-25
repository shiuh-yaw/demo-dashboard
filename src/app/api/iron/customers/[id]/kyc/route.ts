/**
 * Iron Finance KYC API Routes
 *
 * POST /api/iron/customers/[id]/kyc - Start KYC verification
 * GET /api/iron/customers/[id]/kyc - Get KYC status
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

type CustomerParams = Promise<{ id: string }>;

const startKYCSchema = z.object({
  return_url: z.string().url().optional(),
});

/**
 * POST /api/iron/customers/[id]/kyc
 * Start KYC verification for a customer
 */
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id: customer_id } = await params;
      const body = await req.json().catch(() => ({}));

      // Validate request body
      const validated = startKYCSchema.parse(body);

      const session = await ironClient.startKYC({
        customer_id,
        return_url: validated.return_url,
      });

      return createResponse(session, 201, req);
    } catch (error) {
      return handleApiError(error, "iron/customers/kyc/start", req);
    }
  }
);

/**
 * GET /api/iron/customers/[id]/kyc
 * Get customer's current KYC status
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id: customer_id } = await params;
      const status = await ironClient.getCustomerKYCStatus(customer_id);
      return createResponse(status, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/customers/kyc/status", req);
    }
  }
);
