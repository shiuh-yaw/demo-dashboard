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
  VaultAsset,
  VaultWallet,
  DepositAddress,
  TransactionResponse,
  TransactionStatus,
  TransactionOperation,
  TransferPeerPath,
  CreateTransactionRequest,
  ListTransactionsParams,
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
export { getOrCreateDepositAddress, resolveVaultIdByName } from "./vault";
export type { DepositAddressWithVaultId } from "./vault";

// Supported assets (for discovering correct asset IDs)
export { getSupportedAssets } from "./supported-assets";
export type { SupportedAsset } from "./supported-assets";
