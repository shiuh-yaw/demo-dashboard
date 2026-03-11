import { createResponse, handleApiError } from "@/lib/api-response";
import { handleCreateUserVault, handleDeleteUserVault } from "../../handlers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await handleCreateUserVault(body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/users/vault/create");
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await handleDeleteUserVault(body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/users/vault/delete");
  }
}
