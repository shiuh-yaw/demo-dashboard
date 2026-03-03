import { NextResponse } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleListUsers } from "../handlers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const result = await handleListUsers(query);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "admin/users/list");
  }
}
