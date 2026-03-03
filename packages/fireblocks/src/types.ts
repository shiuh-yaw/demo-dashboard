/**
 * Fireblocks TypeScript interfaces
 *
 * Types for vault accounts, wallets, transactions, and screening.
 * Used by both the real and mock Fireblocks clients.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface FireblocksConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

// ─── Vault Types ─────────────────────────────────────────────────────────────

export interface VaultAccount {
  id: string;
  name: string;
  hiddenOnUI: boolean;
  autoFuel: boolean;
  assets: VaultAsset[];
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
  description: string;
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

export interface TransactionResponse {
  id: string;
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
}

export interface TransferPeerPath {
  type: "VAULT_ACCOUNT" | "EXTERNAL_WALLET" | "ONE_TIME_ADDRESS";
  id?: string;
  name?: string;
  address?: string;
}

export interface CreateTransactionRequest {
  assetId: string;
  source: TransferPeerPath;
  destination: TransferPeerPath;
  amount: string;
  note?: string;
  customerRefId?: string;
}

// ─── Screening Types ─────────────────────────────────────────────────────────

export type ScreeningVerdict =
  | "PASSED"
  | "FLAGGED"
  | "BLOCKED"
  | "PENDING"
  | "NOT_SUPPORTED";

export interface ScreeningResult {
  address: string;
  verdict: ScreeningVerdict;
  riskScore: number;
  provider: string;
  details: ScreeningDetail[];
  timestamp: number;
}

export interface ScreeningDetail {
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
}

// ─── Screening Utilities ────────────────────────────────────────────────────

export function isScreeningPassed(result: ScreeningResult): boolean {
  return result.verdict === "PASSED";
}

export function getScreeningRiskLevel(
  result: ScreeningResult,
): "low" | "medium" | "high" {
  if (result.riskScore < 0.3) return "low";
  if (result.riskScore < 0.7) return "medium";
  return "high";
}

// ─── Omnibus Types ───────────────────────────────────────────────────────────

export interface OmnibusStructure {
  omnibusVaultId: string;
  omnibusVaultName: string;
  assetId: string;
  depositAddresses: Map<string, DepositAddress>;
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

// ─── Client Interface ────────────────────────────────────────────────────────

export interface IFireblocksClient {
  // Vault operations
  createVaultAccount(
    name: string,
    opts?: { hiddenOnUI?: boolean },
  ): Promise<VaultAccount>;
  getVaultAccount(vaultId: string): Promise<VaultAccount>;
  listVaultAccounts(limit?: number): Promise<VaultAccount[]>;
  hideVaultAccount(vaultId: string): Promise<void>;

  // Wallet operations
  createVaultWallet(vaultId: string, assetId: string): Promise<VaultWallet>;
  getDepositAddresses(
    vaultId: string,
    assetId: string,
  ): Promise<DepositAddress[]>;
  createDepositAddress(
    vaultId: string,
    assetId: string,
    opts?: { description?: string; customerRefId?: string },
  ): Promise<DepositAddress>;
  getVaultAssetBalance(vaultId: string, assetId: string): Promise<VaultAsset>;

  // Transaction operations
  createTransaction(
    request: CreateTransactionRequest,
  ): Promise<TransactionResponse>;
  getTransaction(txId: string): Promise<TransactionResponse>;
  listTransactions(
    params?: ListTransactionsParams,
  ): Promise<TransactionResponse[]>;

  // Screening
  screenAddress(address: string, assetId: string): Promise<ScreeningResult>;
}
