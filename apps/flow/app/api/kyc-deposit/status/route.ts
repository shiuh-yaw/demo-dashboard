/**
 * GET /api/kyc-deposit/status?applicantId=xxx
 *
 * Checks the KYC verification status for a SumSub applicant.
 *
 * Proxies to dashboard:
 *   GET /api/sumsub/applicants/[id]/status
 */

import { NextResponse, type NextRequest } from "next/server";
import { dashboardGet } from "@/lib/dashboard-api";
import { extractDashboardAuth } from "@/lib/dashboard-auth";

interface StatusResponse {
  reviewStatus?: string;
  reviewResult?: { reviewAnswer?: string };
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicantId = searchParams.get("applicantId");

  if (!applicantId) {
    return NextResponse.json(
      { error: "applicantId query parameter is required" },
      { status: 400 },
    );
  }

  const auth = extractDashboardAuth(request);

  const result = await dashboardGet<StatusResponse>(
    `/api/sumsub/applicants/${encodeURIComponent(applicantId)}/status`,
    auth,
  );

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error || "Failed to fetch KYC status" },
      { status: 502 },
    );
  }

  const { reviewStatus, reviewResult } = result.data;
  const approved =
    reviewStatus === "completed" && reviewResult?.reviewAnswer === "GREEN";

  return NextResponse.json({
    status: reviewStatus,
    approved,
    reviewResult,
  });
}
