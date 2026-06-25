/**
 * SumSub Access Token API Routes
 *
 * POST /api/sumsub/access-token — Generate a WebSDK access token
 *
 * Called by demo apps (e.g. apps/flow /kyc-deposit) with user auth.
 * The token is passed to the SumSub WebSDK on the client for identity
 * verification. Credentials live here per D-003.
 */

import { type NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getSumsubClient } from "@/lib/sumsub/client";
import { env } from "@/env";
import { z } from "zod";

export const OPTIONS = corsOptions;

const generateTokenSchema = z.object({
  userId: z.string().min(1, "userId (applicantId) is required"),
  levelName: z.string().min(1).default(env.SUMSUB_LEVEL_NAME),
  ttlInSecs: z.number().int().positive().optional(),
});

/**
 * POST /api/sumsub/access-token
 * Generate an SDK access token for the SumSub WebSDK.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = generateTokenSchema.parse(body);

    const accessToken = await getSumsubClient().generateAccessToken({
      userId: validated.userId,
      levelName: validated.levelName,
      ...(validated.ttlInSecs !== undefined
        ? { ttlInSecs: validated.ttlInSecs }
        : {}),
    });

    return createResponse(accessToken, 200);
  } catch (error) {
    return handleApiError(error, "sumsub/access-token/generate");
  }
});
