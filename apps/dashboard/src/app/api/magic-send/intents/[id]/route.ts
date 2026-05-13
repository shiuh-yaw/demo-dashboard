/**
 * /api/magic-send/intents/[id]
 *
 * GET — Status of one intent. Returns 404 if the intent doesn't belong
 *       to the calling user (so callers can't enumerate other users'
 *       intents via id guessing).
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

import { getMagicSendIntentService } from "../../_shared";

export const OPTIONS = corsOptions;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const userId = getUserIdFromPayload(user);
    if (!userId) throw new UnauthorizedError();

    const { id } = await ctx.params;
    const svc = getMagicSendIntentService();
    const intent = await svc.getIntent(id);
    if (!intent || intent.userId !== userId) {
      throw new NotFoundError(`Intent ${id} not found`, "MAGIC_SEND_NOT_FOUND");
    }
    return createResponse({ intent });
  } catch (error) {
    return handleApiError(error, "magic-send/intents/get");
  }
}
