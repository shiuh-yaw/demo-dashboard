/**
 * /api/magic-send/intents
 *
 * POST — Create a new magic-send intent. Authenticated.
 *   Body:
 *     {
 *       demoInstanceId, vaultId, recipient, token, amount, chainId,
 *       calls: MagicSendCall[],
 *       idempotencyKey
 *     }
 *
 * GET — List the authenticated user's intents.
 */

import { NextRequest } from "next/server";
import { z } from "zod";

import { OPTIONS as corsOptions } from "@/lib/cors";
import { UnauthorizedError } from "@/lib/errors";
import {
  createResponse,
  handleApiError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserIdFromPayload } from "@dynamic-demos/dynamic";

import { getMagicSendIntentService } from "../_shared";

export const OPTIONS = corsOptions;

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_CALLDATA = /^0x[0-9a-fA-F]*$/;
const UINT_STRING = /^[0-9]+$/;

const callSchema = z.object({
  to: z.string().regex(HEX_ADDRESS, "invalid call.to"),
  data: z.string().regex(HEX_CALLDATA, "invalid call.data").optional(),
  value: z.string().regex(UINT_STRING, "invalid call.value"),
});

const createIntentSchema = z.object({
  demoInstanceId: z.string().min(1),
  vaultId: z.string().min(1),
  recipient: z.string().regex(HEX_ADDRESS, "invalid recipient"),
  token: z.string().regex(HEX_ADDRESS, "invalid token"),
  amount: z.string().regex(UINT_STRING, "invalid amount"),
  chainId: z.number().int().positive(),
  calls: z.array(callSchema).min(1),
  idempotencyKey: z.string().min(8),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const userId = getUserIdFromPayload(user);
    if (!userId) throw new UnauthorizedError();

    const json = await request.json();
    const parsed = createIntentSchema.parse(json);

    const svc = getMagicSendIntentService();
    // The schema validates `0x...`-shape via regex; the runtime values
    // are already `0x${string}`-conformant. The cast is the boundary
    // between Zod's `string` inference and viem's branded hex type;
    // the service does its own normalization (lowercase + re-validate)
    // before persisting.
    const intent = await svc.createIntent({
      ...parsed,
      calls: parsed.calls as unknown as import("@/lib/services/magic-send").MagicSendCall[],
      userId,
    });

    return createResponse({ intent }, 201);
  } catch (error) {
    return handleApiError(error, "magic-send/intents/create");
  }
}

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const userId = getUserIdFromPayload(user);
    if (!userId) throw new UnauthorizedError();

    const svc = getMagicSendIntentService();
    const intents = await svc.listIntentsForUser(userId);
    return createResponse({ intents });
  } catch (error) {
    return handleApiError(error, "magic-send/intents/list");
  }
}
