/**
 * GET /api/demo-configs/[kind]/[id] — unified public read.
 *
 * Replaces per-kind public reads (`/api/checkouts/[id]`, etc.). The handler
 * lives in `../../handlers/get-demo-config.ts` so unit tests can exercise it
 * without a Next runtime.
 */

import { NextRequest } from "next/server";

import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";

import { handleGetDemoConfig } from "../../handlers/get-demo-config";

export const OPTIONS = corsOptions;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await params;
    const result = await handleGetDemoConfig({ kind, id });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "demo-configs/get");
  }
}
