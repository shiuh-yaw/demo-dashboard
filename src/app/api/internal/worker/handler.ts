/**
 * Worker Handler
 *
 * Business logic for transaction status monitoring:
 * 1. Check LI.FI status
 * 2. Update transaction status
 * 3. Re-enqueue if still pending
 */

import { transactionService } from "@/lib/services";
import { lifiService } from "@/lib/services/lifi";
import { updateTransactionStatusWithEffects } from "@/lib/services/workflows";
import { enqueueTransactionMonitor, MAX_RETRIES } from "@/lib/upstash/qstash";
import { Status } from "@/lib/types/dashboard";

export interface WorkerPayload {
  transactionId: string;
  txHash: string;
  retryCount: number;
}

export interface WorkerResult {
  success: boolean;
  message: string;
  status: string;
  error?: string;
  retry?: number;
  messageId?: string;
}

/**
 * Process a transaction status check
 */
export async function handleWorker(
  payload: WorkerPayload
): Promise<WorkerResult> {
  const { transactionId, txHash, retryCount = 0 } = payload;

  console.log(
    `[Worker] Processing transaction ${transactionId}, retry ${retryCount}`
  );

  // Get transaction from database
  const transaction = await transactionService.get(transactionId);
  if (!transaction) {
    console.error(`[Worker] Transaction ${transactionId} not found`);
    return {
      success: false,
      message: "Transaction not found",
      status: "error",
      error: "Transaction not found",
    };
  }

  // Skip if already in terminal state
  if (
    transaction.status === Status.CONFIRMED ||
    transaction.status === Status.FAILED ||
    transaction.status === Status.CANCELLED ||
    transaction.status === Status.EXPIRED ||
    transaction.status === Status.ABANDONED
  ) {
    console.log(
      `[Worker] Transaction ${transactionId} already in terminal state: ${transaction.status}`
    );
    return {
      success: true,
      message: "Transaction already completed",
      status: transaction.status,
    };
  }

  // Check LI.FI status
  const lifiStatus = await lifiService.getStatus(
    txHash,
    transaction.fromChainId
  );
  console.log(`[Worker] LI.FI status for ${transactionId}:`, lifiStatus);

  // Handle DONE status
  if (lifiStatus.status === "DONE") {
    // Prefer LI.FI explorer link, fallback to bridge explorer link
    const explorerUrl =
      lifiStatus.lifiExplorerLink || lifiStatus.bridgeExplorerLink;

    await updateTransactionStatusWithEffects({
      transactionId,
      checkoutId: transaction.checkoutId,
      status: Status.CONFIRMED,
      previousStatus: transaction.status,
      txHash,
      explorerUrl,
      updateUserStats: true,
    });

    return {
      success: true,
      message: "Transaction confirmed",
      status: Status.CONFIRMED,
    };
  }

  // Handle FAILED status
  if (lifiStatus.status === "FAILED") {
    await updateTransactionStatusWithEffects({
      transactionId,
      checkoutId: transaction.checkoutId,
      status: Status.FAILED,
      previousStatus: transaction.status,
      txHash,
      errorMessage: lifiStatus.error || "Transaction failed",
    });

    console.log(`[Worker] Transaction ${transactionId} failed`);
    return {
      success: true,
      message: "Transaction failed",
      status: Status.FAILED,
      error: lifiStatus.error,
    };
  }

  // Handle max retries reached
  if (retryCount >= MAX_RETRIES) {
    console.log(
      `[Worker] Transaction ${transactionId} max retries reached (${MAX_RETRIES})`
    );

    await updateTransactionStatusWithEffects({
      transactionId,
      checkoutId: transaction.checkoutId,
      status: Status.FAILED,
      previousStatus: transaction.status,
      txHash,
      errorMessage: "Max retries reached - status unknown",
    });

    return {
      success: true,
      message: "Max retries reached",
      status: Status.FAILED,
    };
  }

  // Still pending - update status and re-enqueue
  if (transaction.status === Status.SUBMITTED) {
    await transactionService.updateStatus(transactionId, Status.PENDING);
  }

  const newRetryCount = await transactionService.incrementRetry(transactionId);
  const messageId = await enqueueTransactionMonitor(
    transactionId,
    txHash,
    newRetryCount
  );

  console.log(
    `[Worker] Re-enqueued transaction ${transactionId}, retry ${newRetryCount}, messageId: ${messageId}`
  );

  return {
    success: true,
    message: "Transaction still pending",
    status: Status.PENDING,
    retry: newRetryCount,
    messageId: messageId ?? undefined,
  };
}
