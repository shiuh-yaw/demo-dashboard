import { createResponse, handleApiError } from "@/lib/api-response";
import { handleFundTransfer } from "../handlers";

/**
 * Fund: Transfer USDC from omnibus vault to a user vault (VAULT_ACCOUNT → VAULT_ACCOUNT)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleFundTransfer(body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "admin/fund");
  }
}
