/**
 * Iron Finance Customer by ID API Routes
 *
 * GET /api/iron/customers/[id] - Get customer by ID
 * PATCH /api/iron/customers/[id] - Update customer
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient, type UpdateCustomerRequest } from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

type CustomerParams = Promise<{ id: string }>;

const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  business_name: z.string().optional(),
  phone_number: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/iron/customers/[id]
 * Get a customer by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id } = await params;
      const customer = await ironClient.getCustomer(id);
      return createResponse(customer, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/customers/get", req);
    }
  }
);

/**
 * PATCH /api/iron/customers/[id]
 * Update a customer
 */
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: CustomerParams }) => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Validate request body
      const validated = updateCustomerSchema.parse(body);

      const updateRequest: UpdateCustomerRequest = {
        email: validated.email,
        first_name: validated.first_name,
        last_name: validated.last_name,
        business_name: validated.business_name,
        phone_number: validated.phone_number,
        metadata: validated.metadata,
      };

      const customer = await ironClient.updateCustomer(id, updateRequest);

      return createResponse(customer, 200, req);
    } catch (error) {
      return handleApiError(error, "iron/customers/update", req);
    }
  }
);
