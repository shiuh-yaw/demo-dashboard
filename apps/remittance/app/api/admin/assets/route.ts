import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleListAssets } from "../handlers";

/**
 * List Fireblocks supported assets for this workspace.
 * Use this to find the correct asset ID for FIREBLOCKS_DEFAULT_ASSET_ID.
 */
export async function GET() {
  try {
    const result = await handleListAssets();
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/assets");
  }
}
