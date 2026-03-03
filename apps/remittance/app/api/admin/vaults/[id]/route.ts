import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetVault } from "../../handlers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await handleGetVault(id);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/vaults/[id]");
  }
}
