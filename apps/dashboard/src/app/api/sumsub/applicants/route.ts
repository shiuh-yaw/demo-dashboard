/**
 * SumSub Applicant API Routes
 *
 * POST /api/sumsub/applicants — Create a new SumSub applicant
 *
 * Called by demo apps (e.g. apps/flow /kyc-deposit) with user auth.
 * Credentials live here per D-003 — demo apps never see SumSub secrets.
 */

import { type NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getSumsubClient } from "@/lib/sumsub/client";
import { env } from "@/env";
import { z } from "zod";

export const OPTIONS = corsOptions;

const createApplicantSchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required"),
  levelName: z.string().min(1).default(env.SUMSUB_LEVEL_NAME),
  email: z.string().email().optional(),
});

/**
 * POST /api/sumsub/applicants
 * Create an applicant for KYC verification.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = createApplicantSchema.parse(body);

    const applicant = await getSumsubClient().createApplicant({
      externalUserId: validated.externalUserId,
      levelName: validated.levelName,
      ...(validated.email ? { email: validated.email } : {}),
    });

    return createResponse(applicant, 201);
  } catch (error) {
    return handleApiError(error, "sumsub/applicants/create");
  }
});
