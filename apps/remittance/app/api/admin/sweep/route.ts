import { createResponse, handleApiError } from "@/lib/api-response";
import { handleSweepTransfer } from "../handlers";

/**
 * Sweep: Move funds from user vault to omnibus (VAULT_ACCOUNT → VAULT_ACCOUNT)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleSweepTransfer(body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "admin/sweep");
  }
}
