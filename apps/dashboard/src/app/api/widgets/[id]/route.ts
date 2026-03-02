/**
 * Public Widget API Route
 *
 * GET /api/widgets/[id] - Get a widget configuration (unauthenticated)
 *
 * This route is public and does not require authentication.
 * It's used by the widget project to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import {
  createResponse,
  handleApiError,
  createErrorResponse,
} from "@/lib/api-response";
import { checkoutService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const OPTIONS = corsOptions;

/**
 * GET /api/widgets/[id]
 * Get a widget configuration by ID (public, no auth required)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return createErrorResponse("Widget ID is required", 400);
    }

    const config = await checkoutService.get(id);

    if (!config) {
      throw new NotFoundError("Widget not found");
    }

    // Return only the necessary fields for rendering (exclude owner info)
    return createResponse({
      id: config.id,
      name: config.name,
      description: config.description,
      config: config.config,
    });
  } catch (error) {
    return handleApiError(error, "widgets/get");
  }
}
