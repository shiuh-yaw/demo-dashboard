/**
 * Visa Direct API Client
 *
 * Phase 1-2: All methods return mock responses after a 1500ms delay.
 * Phase 3: Real calls to VISA_DIRECT_BASE_URL with VISA_DIRECT_API_KEY.
 */

export interface SendPayoutParams {
  amount: number;
  recipientWallet: string;
  blockchain?: string;
  asset?: string;
}

export interface SendPayoutResponse {
  transactionId: string;
  status: string;
  subStatus: string;
  amount: number;
  asset: string;
  blockchain: string;
  recipientWallet: string;
  timestamp: string;
}

/**
 * Send a Visa Direct push-to-wallet payout.
 * Phase 1: Returns a mock response after 1500ms.
 */
export async function sendPayout(
  params: SendPayoutParams,
): Promise<SendPayoutResponse> {
  // Phase 1-2: stubbed response
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    transactionId: "VD-" + Date.now(),
    status: "EXECUTION_COMPLETED",
    subStatus: "PAYOUT_COMPLETED",
    amount: params.amount,
    asset: "USDC",
    blockchain: params.blockchain ?? "Ethereum",
    recipientWallet: params.recipientWallet,
    timestamp: new Date().toISOString(),
  };
}
