/**
 * /api/magic-send/intents/[id]/execute
 *
 * POST — Internal-only. Fires after the vault → embedded-wallet transfer
 *        confirms. Gated by `x-internal-api-secret`; external callers
 *        get a 401.
 *
 *        Called by /api/webhooks/dynamic (and only by it) after a
 *        `wallet.activity` event resolves a pending intent.
 */

import { NextRequest } from "next/server";

import { OPTIONS as corsOptions } from "@/lib/cors";
import { UnauthorizedError } from "@/lib/errors";
import {
  createResponse,
  handleApiError,
} from "@/lib/api-response";

import {
  checkInternalApiSecret,
  getMagicSendIntentService,
} from "../../../_shared";

export const OPTIONS = corsOptions;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  try {
    if (!checkInternalApiSecret(request)) {
      throw new UnauthorizedError(
        "Missing or invalid x-internal-api-secret",
        "MAGIC_SEND_INTERNAL_AUTH",
      );
    }

    const { id } = await ctx.params;
    // Body may carry an optional dynamic webhook event id so the audit
    // trail links execution to the triggering webhook. Tolerate empty
    // bodies for cases where the receiver doesn't include it.
    let webhookEventId: string | undefined;
    try {
      const text = await request.text();
      if (text.length > 0) {
        const json = JSON.parse(text) as { webhookEventId?: unknown };
        if (typeof json.webhookEventId === "string") {
          webhookEventId = json.webhookEventId;
        }
      }
    } catch {
      // Ignore body parse failures; the route is internal-only and the
      // event id is optional metadata.
    }

    const svc = getMagicSendIntentService();
    const intent = await svc.executeIntent(id, { webhookEventId });
    return createResponse({ intent });
  } catch (error) {
    return handleApiError(error, "magic-send/intents/execute");
  }
}
