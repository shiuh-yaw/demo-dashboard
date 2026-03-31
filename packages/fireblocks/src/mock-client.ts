/**
 * Mock Fireblocks Client
 *
 * Returns realistic responses with configurable delays for demos
 * without requiring real Fireblocks credentials.
 */

import crypto from "crypto";
import type {
  IFireblocksClient,
  InternalWalletSummary,
  VaultAccount,
  VaultWallet,
  DepositAddress,
  TransactionResponse,
  CreateTransactionRequest,
  ListTransactionsParams,
  VaultAsset,
  TransactionStatus,
  AmlScreeningSummary,
  TravelRuleScreeningSummary,
  VaultAccountsTagAttachmentOperationsRequest,
  VaultAccountsTagAttachmentOperationsResponse,
  VaultAccountTagAttachmentOperation,
} from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId(): string {
  return crypto.randomUUID().split("-")[0]!;
}

const MOCK_CHAINALYSIS_SCREENING: AmlScreeningSummary = {
  provider: "CHAINALYSIS_V2",
  screeningStatus: "BYPASSED",
  verdict: "ACCEPT",
  bypassReason: "UNSUPPORTED_ASSET",
};

const MOCK_TRAVEL_RULE_SCREENING: TravelRuleScreeningSummary = {
  provider: "NOTABENE",
  status: "BYPASSED",
  verdict: "ACCEPT",
  bypassReason: "UNSUPPORTED_ASSET",
};

const MOCK_VAULT_ASSET: VaultAsset = {
  id: "BASE_USDC",
  total: "125000.00",
  available: "118500.00",
  pending: "6500.00",
  frozen: "0",
  lockedAmount: "0",
  blockHeight: "284571923",
  blockHash: "4vJ3..mock",
};

const MOCK_TREASURY_VAULT: VaultAccount = {
  id: "vault-0",
  name: "Treasury - Remittance",
  hiddenOnUI: false,
  autoFuel: true,
  tags: [],
  assets: [MOCK_VAULT_ASSET],
};

export class MockFireblocksClient implements IFireblocksClient {
  private vaults: Map<string, VaultAccount> = new Map([
    ["vault-0", MOCK_TREASURY_VAULT],
  ]);
  private internalWallets = new Map<
    string,
    { name: string; customerRefId?: string; assets: Map<string, string> }
  >();
  private transactions: Map<string, TransactionResponse> = new Map();
  /** externalTxId → Fireblocks transaction id */
  private externalTxIdIndex: Map<string, string> = new Map();
  private delayMs: number;

  constructor(options?: { delayMs?: number }) {
    this.delayMs = options?.delayMs ?? 600;
  }

  async createVaultAccount(
    name: string,
    opts?: { hiddenOnUI?: boolean; customerRefId?: string; autoFuel?: boolean },
  ): Promise<VaultAccount> {
    await delay(this.delayMs);
    const vault: VaultAccount = {
      id: `vault-${randomId()}`,
      name,
      hiddenOnUI: opts?.hiddenOnUI ?? false,
      autoFuel: opts?.autoFuel ?? false,
      tags: [],
      assets: [],
      ...(opts?.customerRefId ? { customerRefId: opts.customerRefId } : {}),
    };
    this.vaults.set(vault.id, vault);
    return vault;
  }

  async getVaultAccount(vaultId: string): Promise<VaultAccount> {
    await delay(this.delayMs * 0.5);
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      return { ...MOCK_TREASURY_VAULT, id: vaultId };
    }
    return vault;
  }

  async listVaultAccounts(_limit?: number): Promise<VaultAccount[]> {
    await delay(this.delayMs);
    return Array.from(this.vaults.values());
  }

  async hideVaultAccount(vaultId: string): Promise<void> {
    await delay(this.delayMs);
    this.vaults.delete(vaultId);
  }

  async setVaultAccountCustomerRefId(
    vaultId: string,
    customerRefId: string,
  ): Promise<void> {
    await delay(this.delayMs);
    const vault = this.vaults.get(vaultId);
    if (!vault) return;
    this.vaults.set(vaultId, { ...vault, customerRefId });
  }

  async attachOrDetachTagsFromVaultAccounts(
    request: VaultAccountsTagAttachmentOperationsRequest,
    _opts?: { idempotencyKey?: string },
  ): Promise<VaultAccountsTagAttachmentOperationsResponse> {
    await delay(this.delayMs * 0.5);
    const applied: VaultAccountTagAttachmentOperation[] = [];
    for (const vaultAccountId of request.vaultAccountIds) {
      for (const tagId of request.tagIdsToAttach ?? []) {
        applied.push({
          vaultAccountId,
          tagId,
          action: "ATTACH",
        });
      }
      for (const tagId of request.tagIdsToDetach ?? []) {
        applied.push({
          vaultAccountId,
          tagId,
          action: "DETACH",
        });
      }
    }
    return { appliedOperations: applied };
  }

  async listInternalWallets(): Promise<InternalWalletSummary[]> {
    await delay(this.delayMs * 0.3);
    return Array.from(this.internalWallets.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      customerRefId: v.customerRefId,
    }));
  }

  async createInternalWallet(
    name: string,
    opts?: { customerRefId?: string },
  ): Promise<{ id: string }> {
    await delay(this.delayMs);
    const id = `iw-${randomId()}`;
    this.internalWallets.set(id, {
      name,
      customerRefId: opts?.customerRefId,
      assets: new Map(),
    });
    return { id };
  }

  async getInternalWallet(walletId: string): Promise<{
    id: string;
    assets: { id: string; address?: string }[];
  }> {
    await delay(this.delayMs * 0.3);
    const w = this.internalWallets.get(walletId);
    if (!w) return { id: walletId, assets: [] };
    return {
      id: walletId,
      assets: [...w.assets.entries()].map(([id, address]) => ({
        id,
        address,
      })),
    };
  }

  async createInternalWalletAsset(
    walletId: string,
    assetId: string,
    address: string,
  ): Promise<void> {
    await delay(this.delayMs);
    const w = this.internalWallets.get(walletId);
    if (w) w.assets.set(assetId, address);
  }

  async createVaultWallet(
    vaultId: string,
    assetId: string,
  ): Promise<VaultWallet> {
    await delay(this.delayMs);
    return {
      id: randomId(),
      address: `mock_${assetId}_${randomId()}`,
      description: "",
      tag: "",
      type: "DEPOSIT",
      customerRefId: vaultId,
    };
  }

  async getDepositAddresses(
    _vaultId: string,
    _assetId: string,
  ): Promise<DepositAddress[]> {
    await delay(this.delayMs * 0.5);
    return [
      {
        address: "0x1234567890abcdef1234567890abcdef1234dead",
        description: "Treasury deposit address",
        tag: "",
        type: "DEPOSIT",
      },
    ];
  }

  async createTransaction(
    request: CreateTransactionRequest,
  ): Promise<TransactionResponse> {
    await delay(this.delayMs);

    if (request.externalTxId && this.externalTxIdIndex.has(request.externalTxId)) {
      throw Object.assign(new Error("Duplicate externalTxId"), {
        response: { status: 409 },
      });
    }

    const tx: TransactionResponse = {
      id: `tx-${randomId()}`,
      externalTxId: request.externalTxId,
      status: "SUBMITTED",
      operation: "TRANSFER",
      source: request.source,
      destination: request.destination,
      amount: request.amount,
      assetId: request.assetId,
      note: request.note,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    this.transactions.set(tx.id, tx);
    if (request.externalTxId) {
      this.externalTxIdIndex.set(request.externalTxId, tx.id);
    }

    this.simulateTransactionProgress(tx.id);

    return tx;
  }

  async getTransaction(txId: string): Promise<TransactionResponse> {
    await delay(this.delayMs * 0.3);
    const tx = this.transactions.get(txId);
    if (!tx) {
      return {
        id: txId,
        status: "COMPLETED",
        operation: "TRANSFER",
        source: { type: "VAULT_ACCOUNT", id: "vault-0" },
        destination: { type: "ONE_TIME_ADDRESS", address: "mock" },
        amount: "100",
        assetId: "BASE_USDC",
        txHash: `mock_hash_${randomId()}`,
        createdAt: Date.now() - 60000,
        lastUpdated: Date.now(),
      };
    }
    return tx;
  }

  async getTransactionByExternalTxId(
    externalTxId: string,
  ): Promise<TransactionResponse | null> {
    await delay(this.delayMs * 0.3);
    const txId = this.externalTxIdIndex.get(externalTxId);
    if (!txId) return null;
    return this.transactions.get(txId) ?? null;
  }

  async createDepositAddress(
    vaultId: string,
    assetId: string,
    opts?: { description?: string; customerRefId?: string },
  ): Promise<DepositAddress> {
    await delay(this.delayMs);
    return {
      address: `0x${randomId()}${"a".repeat(32)}${randomId()}`,
      description: opts?.description ?? `Deposit for ${vaultId}`,
      tag: "",
      type: "DEPOSIT",
      customerRefId: opts?.customerRefId,
    };
  }

  async getVaultAssetBalance(
    _vaultId: string,
    assetId: string,
  ): Promise<VaultAsset> {
    await delay(this.delayMs * 0.5);
    return {
      ...MOCK_VAULT_ASSET,
      id: assetId,
    };
  }

  async listTransactions(
    _params?: ListTransactionsParams,
  ): Promise<TransactionResponse[]> {
    await delay(this.delayMs);
    return Array.from(this.transactions.values());
  }

  private simulateTransactionProgress(txId: string): void {
    const statuses: TransactionStatus[] = [
      "PENDING_SIGNATURE",
      "BROADCASTING",
      "CONFIRMING",
      "COMPLETED",
    ];

    let i = 0;
    const advance = () => {
      const tx = this.transactions.get(txId);
      if (!tx || i >= statuses.length) return;
      tx.status = statuses[i]!;
      tx.lastUpdated = Date.now();
      if (tx.status === "COMPLETED") {
        tx.txHash = `mock_hash_${randomId()}`;
        tx.amlScreening = MOCK_CHAINALYSIS_SCREENING;
        tx.travelRuleScreening = MOCK_TRAVEL_RULE_SCREENING;
      }
      i++;
      if (i < statuses.length) {
        setTimeout(advance, 2000 + Math.random() * 1000);
      }
    };
    setTimeout(advance, 1500);
  }
}
