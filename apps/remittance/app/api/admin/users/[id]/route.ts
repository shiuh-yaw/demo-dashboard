import { createResponse, handleApiError } from "@/lib/api-response";
import { handleDeleteUser } from "../../handlers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await handleDeleteUser(id);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/users/delete");
  }
}
