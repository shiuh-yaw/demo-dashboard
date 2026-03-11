import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetTransaction } from "../../handlers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await handleGetTransaction(id);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/transactions/[id]");
  }
}
