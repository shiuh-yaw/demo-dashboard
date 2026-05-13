/**
 * /api/magic-send/credits/[userId]
 *
 * GET — Credit balance for the user, derived from Transaction history.
 *       Authenticated. The path's `[userId]` must match the caller's
 *       JWT `sub`; cross-user lookups return 404 to avoid enumeration.
 */

import { NextRequest } from "next/server";

import { OPTIONS as corsOptions } from "@/lib/cors";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import {
  createResponse,
  handleApiError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserIdFromPayload } from "@dynamic-demos/dynamic";
import { transactionRecordService } from "@/lib/services";
import { getCreditsForUser } from "@/lib/services/magic-send";

export const OPTIONS = corsOptions;

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const callerId = getUserIdFromPayload(user);
    if (!callerId) throw new UnauthorizedError();

    const { userId } = await ctx.params;
    if (userId !== callerId) {
      throw new NotFoundError(`User ${userId} not found`, "MAGIC_SEND_NO_USER");
    }

    const credits = await getCreditsForUser(userId, {
      transactionRecords: transactionRecordService,
    });
    return createResponse({ userId, credits });
  } catch (error) {
    return handleApiError(error, "magic-send/credits");
  }
}
