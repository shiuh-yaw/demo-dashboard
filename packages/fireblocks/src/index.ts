/**
 * @dynamic-demos/fireblocks
 *
 * Shared Fireblocks integration package.
 * Wraps @fireblocks/ts-sdk with real and mock clients for vault management.
 */

// Client factory
export { createFireblocksClient } from "./factory";
export type { CreateFireblocksClientOptions } from "./factory";

// Client implementations
export { FireblocksClient } from "./client";
export { MockFireblocksClient } from "./mock-client";

// Types
export type {
  FireblocksConfig,
  IFireblocksClient,
  VaultAccount,
  VaultAccountTag,
  VaultAsset,
  VaultWallet,
  DepositAddress,
  AmlScreeningSummary,
  TravelRuleScreeningSummary,
  TransactionResponse,
  TransactionStatus,
  TransactionOperation,
  TransferPeerPath,
  CreateTransactionRequest,
  ListTransactionsParams,
  InternalWalletSummary,
  VaultAccountsTagAttachmentOperationsRequest,
  VaultAccountsTagAttachmentOperationsResponse,
  TagAttachmentOperationAction,
  VaultAccountTagAttachmentOperation,
  VaultAccountTagAttachmentPendingOperation,
  VaultAccountTagAttachmentRejectedOperation,
  VaultTagAttachmentRejectedReason,
} from "./types";

// Validation schemas
export {
  transferPeerPathSchema,
  createTransactionRequestSchema,
} from "./validation";
export type {
  ValidatedTransferPeerPath,
  ValidatedCreateTransactionRequest,
} from "./validation";

// Vault operations
export {
  tryGetVaultAccount,
  getOrCreateVaultByName,
  getOrCreateDepositAddressForVault,
  getOrCreateDepositAddress,
  resolveVaultIdByName,
  attachTagsToVaultAccounts,
} from "./vault";
export type { DepositAddressWithVaultId } from "./vault";

// Supported assets (for discovering correct asset IDs)
export { getSupportedAssets } from "./supported-assets";
export type { SupportedAsset } from "./supported-assets";

// Incoming webhooks (JWKS + optional legacy RSA)
export { verifyIncomingFireblocksWebhook } from "./webhook/verify-incoming";
export type { VerifyIncomingFireblocksWebhookOptions } from "./webhook/verify-incoming";
export {
  resolveFireblocksWebhookJwksUrl,
  defaultFireblocksWebhookJwksUrl,
} from "./webhook/default-jwks-url";
export { verifyFireblocksWebhookJwksSignature } from "./webhook/verify-jwks-signature";
export { verifyFireblocksWebhookLegacySignature } from "./webhook/verify-legacy-signature";

export {
  fireblocksWebhookNotificationSchema,
  fireblocksWebhookTransferPeerSchema,
  fireblocksTransactionWebhookDataSchema,
  normalizeFireblocksEventType,
} from "./webhook/notification-schemas";
export type {
  FireblocksWebhookNotification,
  FireblocksTransactionWebhookData,
} from "./webhook/notification-schemas";

// Shared request signing helper (used by orders + raw REST escape hatch)
export {
  signFireblocksRequest,
  type SignFireblocksRequestInput,
  type SignedFireblocksRequest,
} from "./sign-request";

// Raw REST escape hatch
export {
  createApiClient,
  FireblocksApiError,
  type FireblocksApiClient,
  type CreateApiClientConfig,
} from "./api";

// Pre-transaction compliance screening
export {
  createComplianceModule,
  FireblocksComplianceError,
  type ComplianceModule,
  type ComplianceVerdict,
  type ScreenTransactionParams,
  type ScreenTransactionResult,
  type CreateComplianceModuleDeps,
} from "./compliance";

// Trading orders (Fireblocks DVP / Network listings)
export {
  listOrders,
  getOrder,
  createOrder,
  FireblocksOrdersError,
} from "./orders";
export type {
  FireblocksOrder,
  FireblocksOrdersClient,
  OrderSide,
  OrderSettlementType,
  OrderBeneficiary,
  CreateOrderParams,
  CreateOrderResult,
  ListOrdersOptions,
  ProviderAccountRef,
  ProviderEnvironment,
} from "./orders";

// Fireblocks-Network-listing provider wrappers. Namespaced because each
// provider re-exports its own `mapStatus` — flat exports would collide.
// Direct REST integrations (e.g. the `alfredpay` direct path) live in
// their own packages per D-009.
export * as Mtlco from "./providers/mtlco";
export * as Alfredpay from "./providers/alfredpay";
