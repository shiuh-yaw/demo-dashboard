/**
 * Mock Fireblocks Client
 *
 * Returns realistic responses with configurable delays for demos
 * without requiring real Fireblocks credentials.
 */

import crypto from "crypto";
import type {
  IFireblocksClient,
  VaultAccount,
  VaultWallet,
  DepositAddress,
  TransactionResponse,
  CreateTransactionRequest,
  ListTransactionsParams,
  ScreeningResult,
  VaultAsset,
  TransactionStatus,
} from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId(): string {
  return crypto.randomUUID().split("-")[0]!;
}

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

const MOCK_OMNIBUS_VAULT: VaultAccount = {
  id: "vault-0",
  name: "Omnibus - Remittance",
  hiddenOnUI: false,
  autoFuel: true,
  assets: [MOCK_VAULT_ASSET],
};

export class MockFireblocksClient implements IFireblocksClient {
  private vaults: Map<string, VaultAccount> = new Map([
    ["vault-0", MOCK_OMNIBUS_VAULT],
  ]);
  private transactions: Map<string, TransactionResponse> = new Map();
  private delayMs: number;

  constructor(options?: { delayMs?: number }) {
    this.delayMs = options?.delayMs ?? 600;
  }

  async createVaultAccount(
    name: string,
    opts?: { hiddenOnUI?: boolean },
  ): Promise<VaultAccount> {
    await delay(this.delayMs);
    const vault: VaultAccount = {
      id: `vault-${randomId()}`,
      name,
      hiddenOnUI: opts?.hiddenOnUI ?? false,
      autoFuel: false,
      assets: [],
    };
    this.vaults.set(vault.id, vault);
    return vault;
  }

  async getVaultAccount(vaultId: string): Promise<VaultAccount> {
    await delay(this.delayMs * 0.5);
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      return { ...MOCK_OMNIBUS_VAULT, id: vaultId };
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

  async createVaultWallet(
    vaultId: string,
    assetId: string
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
    _assetId: string
  ): Promise<DepositAddress[]> {
    await delay(this.delayMs * 0.5);
    return [
      {
        address: "0x1234567890abcdef1234567890abcdef1234dead",
        description: "Omnibus deposit address",
        tag: "",
        type: "DEPOSIT",
      },
    ];
  }

  async createTransaction(
    request: CreateTransactionRequest
  ): Promise<TransactionResponse> {
    await delay(this.delayMs);
    const tx: TransactionResponse = {
      id: `tx-${randomId()}`,
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

    // Simulate transaction progressing through statuses
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

  async createDepositAddress(
    vaultId: string,
    assetId: string,
    opts?: { description?: string; customerRefId?: string }
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
    assetId: string
  ): Promise<VaultAsset> {
    await delay(this.delayMs * 0.5);
    return {
      ...MOCK_VAULT_ASSET,
      id: assetId,
    };
  }

  async listTransactions(
    _params?: ListTransactionsParams
  ): Promise<TransactionResponse[]> {
    await delay(this.delayMs);
    return Array.from(this.transactions.values());
  }

  async screenAddress(
    address: string,
    _assetId: string
  ): Promise<ScreeningResult> {
    await delay(this.delayMs * 1.5);
    return {
      address,
      verdict: "PASSED",
      riskScore: 0.02,
      provider: "Chainalysis",
      details: [],
      timestamp: Date.now(),
    };
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
      }
      i++;
      if (i < statuses.length) {
        setTimeout(advance, 2000 + Math.random() * 1000);
      }
    };
    setTimeout(advance, 1500);
  }
}
