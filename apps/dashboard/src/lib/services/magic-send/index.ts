/**
 * Magic-send service surface.
 *
 * Public, stable exports for the magic-send primitive. Routes consume
 * the service via this module; the internal files are implementation
 * details. See ./AGENTS.md for the full surface contract.
 */

export type {
  CreateMagicSendIntentInput,
  CreditBalance,
  HexAddress,
  MagicSendCall,
  MagicSendIntent,
  MagicSendStatus,
  PendingIntent,
  UserOpExecutor,
  UserOpExecutorRequest,
  UserOpExecutorResult,
  VaultAdapter,
  VaultTransferRequest,
  VaultTransferResult,
} from "./types";

export {
  IDEMPOTENCY_TTL_SECONDS,
  MAGIC_SEND_KIND,
  MagicSendIntentService,
  PENDING_TTL_SECONDS,
  idempotencyKey,
  newIntentId,
  pendingIntentKey,
  toMagicSendIntent,
} from "./intents";
export type { MagicSendRedisClient, MagicSendServiceDeps } from "./intents";

export { getCreditsForUser } from "./credits";

export {
  ViemVaultAdapter,
  vaultAdapterFromEnv,
} from "./vault";
export type { ViemVaultAdapterConfig, VaultEnv } from "./vault";

export {
  normalizeDynamicWalletActivity,
  processDynamicWalletActivityWebhook,
  verifyDynamicWebhookSignature,
} from "./webhooks";
export type {
  DynamicWalletActivityEvent,
  ProcessDynamicWebhookDeps,
  ProcessDynamicWebhookOutcome,
} from "./webhooks";
