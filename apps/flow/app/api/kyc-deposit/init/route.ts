/**
 * POST /api/kyc-deposit/init
 *
 * Creates a SumSub applicant for the authenticated user and returns an
 * SDK access token for client-side WebSDK initialization.
 *
 * Proxies to dashboard:
 *   POST /api/sumsub/applicants  — create applicant
 *   POST /api/sumsub/access-token — generate SDK token
 */

import { NextResponse, type NextRequest } from "next/server";
import { dashboardPost } from "@/lib/dashboard-api";
import { extractDashboardAuth } from "@/lib/dashboard-auth";

interface InitBody {
  externalUserId: string;
  email?: string;
}

interface ApplicantResponse {
  id: string;
  externalUserId: string;
  [key: string]: unknown;
}

interface AccessTokenResponse {
  token: string;
  userId: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  let body: InitBody;
  try {
    body = (await request.json()) as InitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { externalUserId, email } = body;
  if (!externalUserId) {
    return NextResponse.json(
      { error: "externalUserId is required" },
      { status: 400 },
    );
  }

  const auth = extractDashboardAuth(request);

  // levelName intentionally omitted — the dashboard owns SumSub config
  // (D-003) and defaults it from SUMSUB_LEVEL_NAME, so the level can be
  // matched to the connected SumSub account without redeploying this app.
  const applicantResult = await dashboardPost<ApplicantResponse>(
    "/api/sumsub/applicants",
    {
      externalUserId,
      ...(email ? { email } : {}),
    },
    auth,
  );

  if (applicantResult.error || !applicantResult.data) {
    return NextResponse.json(
      { error: applicantResult.error || "Failed to create applicant" },
      { status: 502 },
    );
  }

  const applicantId = applicantResult.data.id;

  const tokenResult = await dashboardPost<AccessTokenResponse>(
    "/api/sumsub/access-token",
    {
      userId: applicantId,
    },
    auth,
  );

  if (tokenResult.error || !tokenResult.data) {
    return NextResponse.json(
      { error: tokenResult.error || "Failed to generate access token" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    applicantId,
    accessToken: tokenResult.data.token,
  });
}
