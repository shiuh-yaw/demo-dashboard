import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import {
  handleGetVaultAddresses,
  handleCreateVaultAddress,
} from "../../../handlers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await handleGetVaultAddresses(id);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/vaults/[id]/addresses");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await handleCreateVaultAddress(id, body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "admin/vaults/[id]/addresses/create");
  }
}
