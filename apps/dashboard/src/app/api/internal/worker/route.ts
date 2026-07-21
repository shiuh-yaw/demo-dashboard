/**
 * QStash Worker - Transaction Status Monitor
 *
 * POST /api/internal/worker - Process transaction status checks
 *
 * This endpoint is called by QStash to poll LI.FI for transaction status.
 * It uses exponential backoff and re-enqueues itself until the transaction
 * reaches a terminal state (confirmed/failed).
 */

import { NextRequest } from "next/server";
import { verifyQStashSignature } from "@/lib/upstash/qstash";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { handleWorker, type WorkerPayload } from "./handler";

export async function POST(request: NextRequest) {
  // QStash signature is mandatory - unsigned requests are rejected.
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();

  if (!signature) {
    return createErrorResponse("Unauthorized", 401);
  }
  const isValid = await verifyQStashSignature(signature, body);
  if (!isValid) {
    return createErrorResponse("Unauthorized", 401);
  }

  // Parse payload
  let payload: WorkerPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return createErrorResponse("Invalid payload", 400);
  }

  // Validate required fields
  if (!payload.transactionId || !payload.txHash) {
    return createErrorResponse("Missing transactionId or txHash", 400);
  }

  // Process the transaction
  const result = await handleWorker(payload);

  if (!result.success) {
    return createResponse(result, 404);
  }

  return createResponse(result);
}
