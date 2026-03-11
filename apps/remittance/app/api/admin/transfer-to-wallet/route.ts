import { createResponse, handleApiError } from "@/lib/api-response";
import { handleTransferToWallet } from "../handlers";

/**
 * Transfer to wallet: Send from omnibus vault to user's embedded wallet (ONE_TIME_ADDRESS)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleTransferToWallet(body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "admin/transfer-to-wallet");
  }
}
