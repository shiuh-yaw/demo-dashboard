/**
 * Checkout Users API
 *
 * GET /api/checkouts/[id]/users - List users for a checkout
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleListUsers } from "../../handlers/list-users";
import type { CheckoutParams } from "../types";

export const OPTIONS = corsOptions;

export const GET = withAuth(
  async (request, { params }: { params: CheckoutParams }) => {
    try {
      const { id: checkoutId } = await params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);

      const result = await handleListUsers({ checkoutId, page, pageSize });
      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/users");
    }
  }
);
