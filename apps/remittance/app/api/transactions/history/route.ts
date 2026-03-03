import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetTransactionHistory } from "../../handlers/transactions-history";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const address = searchParams.get("address");
    const networkId = searchParams.get("networkId");
    const limit = searchParams.get("limit") ?? "20";
    const pageKey = searchParams.get("pageKey");

    const result = await handleGetTransactionHistory({
      address: address ?? "",
      networkId: networkId ?? "",
      limit,
      pageKey,
    });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "transactions/history");
  }
}
