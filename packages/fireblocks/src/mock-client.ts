/**
 * Mock Fireblocks Client
 *
 * Returns realistic responses with configurable delays for demos
 * without requiring real Fireblocks credentials. Mirrors the
 * namespaced surface exposed by `FireblocksClient`.
 */

import crypto from "crypto";

import type { FireblocksApiClient } from "./api";
import type { IFireblocksClient } from "./client-interface";
import type { ComplianceModule } from "./compliance";
import type { OrdersNamespace } from "./orders";
import * as alfredpay from "./providers/alfredpay";
import * as mtlco from "./providers/mtlco";
import type {
  AmlScreeningSummary,
  CreateTransactionRequest,
  DepositAddress,
  InternalWalletSummary,
  InternalWalletsNamespace,
  ListTransactionsParams,
  TransactionResponse,
  TransactionStatus,
  TransactionsNamespace,
  TravelRuleScreeningSummary,
  VaultAccount,
  VaultAccountsTagAttachmentOperationsRequest,
  VaultAccountsTagAttachmentOperationsResponse,
  VaultAccountTagAttachmentOperation,
  VaultAsset,
  VaultNamespace,
  VaultWallet,
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
  // Internal mutable state for the mock — kept private so the public
  // surface matches `IFireblocksClient` exactly.
  private vaults: Map<string, VaultAccount> = new Map([
    ["vault-0", MOCK_TREASURY_VAULT],
  ]);
  private internalWalletStore = new Map<
    string,
    { name: string; customerRefId?: string; assets: Map<string, string> }
  >();
  private txStore: Map<string, TransactionResponse> = new Map();
  /** externalTxId → Fireblocks transaction id */
  private externalTxIdIndex: Map<string, string> = new Map();
  private delayMs: number;

  // Public namespaced surface — initialized in the constructor so each
  // method can reference `this` for shared state.
  readonly vault: VaultNamespace;
  readonly transactions: TransactionsNamespace;
  readonly internalWallets: InternalWalletsNamespace;
  readonly orders: OrdersNamespace;
  readonly compliance: ComplianceModule;
  readonly providers: { mtlco: typeof mtlco; alfredpay: typeof alfredpay };
  readonly sdk: never;
  readonly api: FireblocksApiClient;

  constructor(options?: { delayMs?: number }) {
    this.delayMs = options?.delayMs ?? 600;

    // ─── vault ────────────────────────────────────────────────────────────
    this.vault = {
      createAccount: async (name, opts) => {
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
      },

      getAccount: async (vaultId) => {
        await delay(this.delayMs * 0.5);
        const vault = this.vaults.get(vaultId);
        if (!vault) {
          return { ...MOCK_TREASURY_VAULT, id: vaultId };
        }
        return vault;
      },

      listAccounts: async (_limit) => {
        await delay(this.delayMs);
        return Array.from(this.vaults.values());
      },

      hideAccount: async (vaultId) => {
        await delay(this.delayMs);
        this.vaults.delete(vaultId);
      },

      setCustomerRefId: async (vaultId, customerRefId) => {
        await delay(this.delayMs);
        const vault = this.vaults.get(vaultId);
        if (!vault) return;
        this.vaults.set(vaultId, { ...vault, customerRefId });
      },

      attachOrDetachTags: async (
        request: VaultAccountsTagAttachmentOperationsRequest,
        _opts?: { idempotencyKey?: string },
      ): Promise<VaultAccountsTagAttachmentOperationsResponse> => {
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
      },

      createWallet: async (vaultId, assetId): Promise<VaultWallet> => {
        await delay(this.delayMs);
        return {
          id: randomId(),
          address: `mock_${assetId}_${randomId()}`,
          description: "",
          tag: "",
          type: "DEPOSIT",
          customerRefId: vaultId,
        };
      },

      getDepositAddresses: async (
        _vaultId,
        _assetId,
      ): Promise<DepositAddress[]> => {
        await delay(this.delayMs * 0.5);
        return [
          {
            address: "0x1234567890abcdef1234567890abcdef1234dead",
            description: "Treasury deposit address",
            tag: "",
            type: "DEPOSIT",
          },
        ];
      },

      createDepositAddress: async (vaultId, _assetId, opts) => {
        await delay(this.delayMs);
        return {
          address: `0x${randomId()}${"a".repeat(32)}${randomId()}`,
          description: opts?.description ?? `Deposit for ${vaultId}`,
          tag: "",
          type: "DEPOSIT",
          customerRefId: opts?.customerRefId,
        };
      },

      getAssetBalance: async (_vaultId, assetId): Promise<VaultAsset> => {
        await delay(this.delayMs * 0.5);
        return {
          ...MOCK_VAULT_ASSET,
          id: assetId,
        };
      },
    };

    // ─── transactions ─────────────────────────────────────────────────────
    this.transactions = {
      create: async (
        request: CreateTransactionRequest,
      ): Promise<TransactionResponse> => {
        await delay(this.delayMs);

        if (
          request.externalTxId &&
          this.externalTxIdIndex.has(request.externalTxId)
        ) {
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
        this.txStore.set(tx.id, tx);
        if (request.externalTxId) {
          this.externalTxIdIndex.set(request.externalTxId, tx.id);
        }

        this.simulateTransactionProgress(tx.id);

        return tx;
      },

      get: async (txId) => {
        await delay(this.delayMs * 0.3);
        const tx = this.txStore.get(txId);
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
      },

      getByExternalId: async (externalTxId) => {
        await delay(this.delayMs * 0.3);
        const txId = this.externalTxIdIndex.get(externalTxId);
        if (!txId) return null;
        return this.txStore.get(txId) ?? null;
      },

      list: async (_params?: ListTransactionsParams) => {
        await delay(this.delayMs);
        return Array.from(this.txStore.values());
      },
    };

    // ─── internalWallets ──────────────────────────────────────────────────
    this.internalWallets = {
      list: async (): Promise<InternalWalletSummary[]> => {
        await delay(this.delayMs * 0.3);
        return Array.from(this.internalWalletStore.entries()).map(([id, v]) => ({
          id,
          name: v.name,
          customerRefId: v.customerRefId,
        }));
      },

      get: async (walletId) => {
        await delay(this.delayMs * 0.3);
        const w = this.internalWalletStore.get(walletId);
        if (!w) return { id: walletId, assets: [] };
        return {
          id: walletId,
          assets: [...w.assets.entries()].map(([id, address]) => ({
            id,
            address,
          })),
        };
      },

      create: async (name, opts) => {
        await delay(this.delayMs);
        const id = `iw-${randomId()}`;
        this.internalWalletStore.set(id, {
          name,
          customerRefId: opts?.customerRefId,
          assets: new Map(),
        });
        return { id };
      },

      createAsset: async (walletId, assetId, address) => {
        await delay(this.delayMs);
        const w = this.internalWalletStore.get(walletId);
        if (w) w.assets.set(assetId, address);
      },
    };

    // ─── orders (mock) ────────────────────────────────────────────────────
    this.orders = {
      list: async () => [],
      get: async (orderId) =>
        ({
          id: orderId,
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
        }) as never,
      create: async () =>
        ({
          orderId: `mock-order-${randomId()}`,
          status: "SUBMITTED",
          raw: { id: `mock-order-${randomId()}`, status: "SUBMITTED" },
        }) as never,
    };

    // ─── compliance (mock — always allow) ─────────────────────────────────
    this.compliance = {
      screenTransaction: async () => ({
        verdict: "allow",
        providers: [],
        raw: { mock: true },
      }),
    };

    // ─── providers ────────────────────────────────────────────────────────
    this.providers = { mtlco, alfredpay };

    // ─── sdk (mock — unused; cast through never) ──────────────────────────
    this.sdk = {} as never;

    // ─── api (mock — returns empty objects) ───────────────────────────────
    this.api = {
      get: async () => ({}) as never,
      post: async () => ({}) as never,
      put: async () => ({}) as never,
      delete: async () => ({}) as never,
      patch: async () => ({}) as never,
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
      const tx = this.txStore.get(txId);
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
