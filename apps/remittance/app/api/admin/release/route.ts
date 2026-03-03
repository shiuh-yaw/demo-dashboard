import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleReleaseTransfer } from "../handlers";

/**
 * Release: Transfer USDC from vault to a user wallet address (VAULT_ACCOUNT → ONE_TIME_ADDRESS)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleReleaseTransfer(body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "admin/release");
  }
}
