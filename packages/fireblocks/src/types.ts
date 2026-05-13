/**
 * Fireblocks TypeScript interfaces
 *
 * Types for vault accounts, wallets, and transactions.
 * Used by both the real and mock Fireblocks clients.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface FireblocksConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

// ─── Vault Types ─────────────────────────────────────────────────────────────

/** Normalized from Fireblocks `VaultAccount.tags` (id and isProtected only). */
export interface VaultAccountTag {
  id: string;
  isProtected: boolean;
}

export interface VaultAccount {
  id: string;
  name: string;
  hiddenOnUI: boolean;
  autoFuel: boolean;
  assets: VaultAsset[];
  /** From API when listing or creating a vault; assign via attach-tags, not create body. */
  tags: VaultAccountTag[];
  /** Deposit app: Fireblocks internal wallet id after whitelisting the embedded wallet. */
  customerRefId?: string;
}

export interface VaultAsset {
  id: string;
  total: string;
  available: string;
  pending: string;
  frozen: string;
  lockedAmount: string;
  blockHeight: string;
  blockHash: string;
}

export interface VaultWallet {
  id: string;
  address: string;
  description: string;
  tag: string;
  type: string;
  customerRefId?: string;
  addressFormat?: string;
}

export interface DepositAddress {
  address: string;
  description?: string;
  tag?: string;
  type?: string;
  customerRefId?: string;
  addressFormat?: string;
  legacyAddress?: string;
  enterpriseAddress?: string;
}

// ─── Transaction Types ───────────────────────────────────────────────────────

export type TransactionStatus =
  | "SUBMITTED"
  | "QUEUED"
  | "PENDING_AUTHORIZATION"
  | "PENDING_SIGNATURE"
  | "BROADCASTING"
  | "CONFIRMING"
  | "COMPLETED"
  | "CANCELLED"
  | "BLOCKED"
  | "REJECTED"
  | "FAILED";

export type TransactionOperation =
  | "TRANSFER"
  | "MINT"
  | "BURN"
  | "CONTRACT_CALL"
  | "RAW";

/** Normalized from Fireblocks `amlScreeningResult` / compliance AML payload. */
export interface AmlScreeningSummary {
  provider: string;
  screeningStatus: string;
  verdict?: string;
  bypassReason?: string;
}

/** Normalized from Fireblocks `complianceResults.tr` (e.g. Notabene travel rule). */
export interface TravelRuleScreeningSummary {
  provider: string;
  /** Fireblocks travel-rule status (e.g. BYPASSED). */
  status: string;
  verdict?: string;
  bypassReason?: string;
}

export interface TransactionResponse {
  id: string;
  /**
   * Unique transaction ID provided by the caller at creation time.
   * @see https://developers.fireblocks.com/reference/createtransaction
   */
  externalTxId?: string;
  status: TransactionStatus;
  subStatus?: string;
  txHash?: string;
  operation: TransactionOperation;
  source: TransferPeerPath;
  destination: TransferPeerPath;
  amount: string;
  assetId: string;
  fee?: string;
  networkFee?: string;
  note?: string;
  createdAt: number;
  lastUpdated: number;
  /** Present when Fireblocks includes AML / Chainalysis screening on the transaction. */
  amlScreening?: AmlScreeningSummary;
  /** Travel Rule compliance when Fireblocks includes `complianceResults.tr`. */
  travelRuleScreening?: TravelRuleScreeningSummary;
}

export interface TransferPeerPath {
  type:
    | "VAULT_ACCOUNT"
    | "EXTERNAL_WALLET"
    | "INTERNAL_WALLET"
    | "ONE_TIME_ADDRESS";
  id?: string;
  name?: string;
  address?: string;
}

export interface CreateTransactionRequest {
  assetId: string;
  source: TransferPeerPath;
  destination: TransferPeerPath;
  amount: string;
  /**
   * Caller-provided idempotency key. Fireblocks rejects duplicates server-side.
   * @see https://developers.fireblocks.com/reference/createtransaction
   */
  externalTxId?: string;
  note?: string;
  customerRefId?: string;
  /**
   * When set, overrides the workspace gasless default for this transaction.
   * `false` — direct / vault-paid fees; `true` — gasless (relay) where configured.
   * @see https://developers.fireblocks.com/reference/createtransaction
   */
  useGasless?: boolean;
}

// ─── Query Params ───────────────────────────────────────────────────────────

export interface ListTransactionsParams {
  before?: string;
  after?: string;
  status?: TransactionStatus;
  sourceType?: TransferPeerPath["type"];
  sourceId?: string;
  destType?: TransferPeerPath["type"];
  destId?: string;
  assets?: string;
  limit?: number;
  orderBy?: "createdAt" | "lastUpdated";
  sort?: "ASC" | "DESC";
}

/** Summary row from `GET /v1/internal_wallets`. */
export interface InternalWalletSummary {
  id: string;
  name: string;
  customerRefId?: string;
}

/** @see https://developers.fireblocks.com/reference/attachordetachtagsfromvaultaccounts */
export interface VaultAccountsTagAttachmentOperationsRequest {
  vaultAccountIds: string[];
  tagIdsToAttach?: string[];
  tagIdsToDetach?: string[];
}

export type TagAttachmentOperationAction = "ATTACH" | "DETACH";

export interface VaultAccountTagAttachmentOperation {
  vaultAccountId: string;
  tagId: string;
  action: TagAttachmentOperationAction;
}

export interface VaultAccountTagAttachmentPendingOperation {
  vaultAccountId: string;
  tagId: string;
  action: TagAttachmentOperationAction;
  approvalRequestId: string;
}

export type VaultTagAttachmentRejectedReason =
  | "CAPACITY_EXCEEDED"
  | "ATTACHMENT_ALREADY_EXISTS"
  | "ATTACHMENT_DOES_NOT_EXIST"
  | "PENDING_REQUEST_EXISTS";

export interface VaultAccountTagAttachmentRejectedOperation {
  vaultAccountId: string;
  tagId: string;
  action: TagAttachmentOperationAction;
  reason: VaultTagAttachmentRejectedReason;
}

export interface VaultAccountsTagAttachmentOperationsResponse {
  appliedOperations?: VaultAccountTagAttachmentOperation[];
  pendingOperations?: VaultAccountTagAttachmentPendingOperation[];
  rejectedOperations?: VaultAccountTagAttachmentRejectedOperation[];
}

// ─── Namespaced Client Interface ─────────────────────────────────────────────

export interface VaultNamespace {
  createAccount(
    name: string,
    opts?: { hiddenOnUI?: boolean; customerRefId?: string; autoFuel?: boolean },
  ): Promise<VaultAccount>;
  getAccount(vaultId: string): Promise<VaultAccount>;
  listAccounts(limit?: number): Promise<VaultAccount[]>;
  hideAccount(vaultId: string): Promise<void>;
  setCustomerRefId(vaultId: string, customerRefId: string): Promise<void>;
  /**
   * Attach and/or detach workspace tags on vault accounts.
   * @see https://developers.fireblocks.com/reference/attachordetachtagsfromvaultaccounts
   */
  attachOrDetachTags(
    request: VaultAccountsTagAttachmentOperationsRequest,
    opts?: { idempotencyKey?: string },
  ): Promise<VaultAccountsTagAttachmentOperationsResponse>;
  createWallet(vaultId: string, assetId: string): Promise<VaultWallet>;
  getDepositAddresses(
    vaultId: string,
    assetId: string,
  ): Promise<DepositAddress[]>;
  createDepositAddress(
    vaultId: string,
    assetId: string,
    opts?: { description?: string; customerRefId?: string },
  ): Promise<DepositAddress>;
  getAssetBalance(vaultId: string, assetId: string): Promise<VaultAsset>;
}

export interface TransactionsNamespace {
  create(request: CreateTransactionRequest): Promise<TransactionResponse>;
  get(txId: string): Promise<TransactionResponse>;
  /** @see https://developers.fireblocks.com/reference/gettransactionbyexternaltxid */
  getByExternalId(externalTxId: string): Promise<TransactionResponse | null>;
  list(params?: ListTransactionsParams): Promise<TransactionResponse[]>;
}

export interface InternalWalletsNamespace {
  /** @see https://developers.fireblocks.com/reference/createinternalwallet */
  list(): Promise<InternalWalletSummary[]>;
  get(walletId: string): Promise<{
    id: string;
    assets: { id: string; address?: string }[];
  }>;
  create(
    name: string,
    opts?: { customerRefId?: string },
  ): Promise<{ id: string }>;
  /** Whitelist an asset address on an internal wallet (embedded wallet in your ecosystem). */
  createAsset(
    walletId: string,
    assetId: string,
    address: string,
  ): Promise<void>;
}

// `IFireblocksClient` itself is declared in `./client-interface.ts` to
// avoid a circular dependency: orders / compliance / api types import
// `types.ts`, and `IFireblocksClient` references them. Re-exported below
// so callers that historically import it from `./types` keep working.
export type { IFireblocksClient } from "./client-interface";
