import { createResponse, handleApiError } from "@/lib/api-response";
import { handleCreateUserWallet } from "../../handlers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await handleCreateUserWallet(body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/users/wallet");
  }
}
