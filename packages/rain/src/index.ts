/**
 * @dynamic-demos/rain
 *
 * Server-side Rain issuing API wrapper (virtual stablecoin debit cards).
 * Sandbox-by-default; the client never reads process.env - the dashboard
 * getRainClient injects credentials.
 */

export {
  RainClient,
  RainApiError,
  type RainRequester,
  type RainClientOptions,
} from "./client";

export { RAIN_SANDBOX_BASE_URL, resolveRainBaseUrl } from "./env";

export { createFakeRainClient } from "./mock-client";

export {
  createUserApplication,
  createCardForUser,
  userCreditBalance,
  cardEncryptedData,
  createUserDepositContract,
  userDepositContract,
  transactions,
  userWithdrawalSignature,
  type TransactionQueryParams,
  type WithdrawalSignatureOptions,
} from "./methods";

export type * from "./types";
