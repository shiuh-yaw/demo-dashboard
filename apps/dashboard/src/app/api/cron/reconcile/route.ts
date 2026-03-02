/**
 * Cron Job - Transaction Reconciliation
 *
 * GET /api/cron/reconcile - Run reconciliation tasks
 *
 * Called by Vercel Cron every 5 minutes to:
 * 1. Re-enqueue stale pending transactions
 * 2. Mark old draft transactions as abandoned
 * 3. Mark old initialized transactions as expired
 */

import { NextRequest } from "next/server";
import { env } from "@/env";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { handleReconcile } from "./handler";

export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = request.headers.get("authorization");

  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return createErrorResponse("Unauthorized", 401);
  }

  const result = await handleReconcile();
  if (!result.success) return createResponse(result, 500);

  return createResponse(result);
}
