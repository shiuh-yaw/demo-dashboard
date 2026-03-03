import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleApproveKyc } from "../../handlers/kyc";

/**
 * POST /api/kyc/approve
 * Mark the current user's KYC as approved in Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleApproveKyc(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "kyc/approve");
  }
}
