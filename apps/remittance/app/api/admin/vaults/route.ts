import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetOmnibusVault } from "../handlers";

/**
 * Returns the configured omnibus vault only.
 */
export async function GET() {
  try {
    const result = await handleGetOmnibusVault();
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/vaults");
  }
}
