/**
 * Fireblocks API Client
 *
 * Wraps the official @fireblocks/ts-sdk with our simplified types.
 */

import { Fireblocks, type BasePath } from "@fireblocks/ts-sdk";
import type {
  FireblocksConfig,
  IFireblocksClient,
  VaultAccount,
  VaultAsset,
  VaultWallet,
  DepositAddress,
  TransactionResponse,
  CreateTransactionRequest,
  ListTransactionsParams,
  TransferPeerPath,
} from "./types";

export class FireblocksClient implements IFireblocksClient {
  private sdk: Fireblocks;

  constructor(config: FireblocksConfig) {
    this.sdk = new Fireblocks({
      apiKey: config.apiKey,
      secretKey: config.apiSecret,
      basePath: config.baseUrl as BasePath,
    });
  }

  async createVaultAccount(
    name: string,
    opts?: { hiddenOnUI?: boolean },
  ): Promise<VaultAccount> {
    const res = await this.sdk.vaults.createVaultAccount({
      createVaultAccountRequest: {
        name,
        hiddenOnUI: opts?.hiddenOnUI ?? false,
        autoFuel: false,
      },
    });
    return this.mapVaultAccount(res.data);
  }

  async getVaultAccount(vaultId: string): Promise<VaultAccount> {
    const res = await this.sdk.vaults.getVaultAccount({
      vaultAccountId: vaultId,
    });
    return this.mapVaultAccount(res.data);
  }

  async listVaultAccounts(limit = 50): Promise<VaultAccount[]> {
    const res = await this.sdk.vaults.getPagedVaultAccounts({ limit });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data.accounts ?? []).map((a: any) => this.mapVaultAccount(a));
  }

  async hideVaultAccount(vaultId: string): Promise<void> {
    await this.sdk.vaults.hideVaultAccount({ vaultAccountId: vaultId });
  }

  async createVaultWallet(
    vaultId: string,
    assetId: string,
  ): Promise<VaultWallet> {
    const res = await this.sdk.vaults.createVaultAccountAsset({
      vaultAccountId: vaultId,
      assetId,
    });
    return this.mapVaultWallet(res.data);
  }

  async getDepositAddresses(
    vaultId: string,
    assetId: string,
  ): Promise<DepositAddress[]> {
    const res = await this.sdk.vaults.getVaultAccountAssetAddressesPaginated({
      vaultAccountId: vaultId,
      assetId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data.addresses ?? []).map((a: any) => ({
      address: String(a.address ?? ""),
      description: String(a.description ?? ""),
      tag: String(a.tag ?? ""),
      type: String(a.type ?? ""),
      customerRefId: a.customerRefId as string | undefined,
      addressFormat: a.addressFormat as string | undefined,
      legacyAddress: a.legacyAddress as string | undefined,
      enterpriseAddress: a.enterpriseAddress as string | undefined,
    }));
  }

  async createTransaction(
    request: CreateTransactionRequest,
  ): Promise<TransactionResponse> {
    const res = await this.sdk.transactions.createTransaction({
      transactionRequest: {
        assetId: request.assetId,
        amount: request.amount,
        source: this.mapPeerPathToSdk(request.source),
        destination: this.mapPeerPathToSdk(request.destination),
        note: request.note,
        customerRefId: request.customerRefId,
      },
    });
    // createTransaction returns a minimal response (id + status).
    // Fetch the full transaction to return our complete type.
    const txId = String(res.data.id);
    return this.getTransaction(txId);
  }

  async getTransaction(txId: string): Promise<TransactionResponse> {
    const res = await this.sdk.transactions.getTransaction({ txId });
    return this.mapTransaction(res.data);
  }

  async createDepositAddress(
    vaultId: string,
    assetId: string,
    opts?: { description?: string; customerRefId?: string },
  ): Promise<DepositAddress> {
    const res = await this.sdk.vaults.createVaultAccountAssetAddress({
      vaultAccountId: vaultId,
      assetId,
      createAddressRequest: {
        description: opts?.description,
        customerRefId: opts?.customerRefId,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = res.data as any;
    return {
      address: String(raw.address ?? ""),
      description: String(raw.description ?? opts?.description ?? ""),
      tag: String(raw.tag ?? ""),
      type: String(raw.type ?? "DEPOSIT"),
      customerRefId: raw.customerRefId as string | undefined,
      addressFormat: raw.addressFormat as string | undefined,
      legacyAddress: raw.legacyAddress as string | undefined,
      enterpriseAddress: raw.enterpriseAddress as string | undefined,
    };
  }

  async getVaultAssetBalance(
    vaultId: string,
    assetId: string,
  ): Promise<VaultAsset> {
    const res = await this.sdk.vaults.getVaultAccountAsset({
      vaultAccountId: vaultId,
      assetId,
    });
    const raw = res.data;
    return {
      id: String(raw.id ?? assetId),
      total: String(raw.total ?? "0"),
      available: String(raw.available ?? "0"),
      pending: String(raw.pending ?? "0"),
      frozen: String(raw.frozen ?? "0"),
      lockedAmount: String(raw.lockedAmount ?? "0"),
      blockHeight: String(raw.blockHeight ?? ""),
      blockHash: String(raw.blockHash ?? ""),
    };
  }

  async listTransactions(
    params?: ListTransactionsParams,
  ): Promise<TransactionResponse[]> {
    const res = await this.sdk.transactions.getTransactions({
      before: params?.before,
      after: params?.after,
      status: params?.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceType: params?.sourceType as any,
      sourceId: params?.sourceId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destType: params?.destType as any,
      destId: params?.destId,
      assets: params?.assets,
      limit: params?.limit ?? 50,
      orderBy: params?.orderBy,
      sort: params?.sort,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data ?? []).map((tx: any) => this.mapTransaction(tx));
  }

  // ─── Private mappers ───────────────────────────────────────────────────────
  // SDK response types are complex; we normalize to our simplified types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapVaultAccount(raw: any): VaultAccount {
    const assets = Array.isArray(raw.assets) ? raw.assets : [];
    return {
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      hiddenOnUI: Boolean(raw.hiddenOnUI),
      autoFuel: Boolean(raw.autoFuel),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assets: assets.map((a: any) => ({
        id: String(a.id ?? ""),
        total: String(a.total ?? "0"),
        available: String(a.available ?? "0"),
        pending: String(a.pending ?? "0"),
        frozen: String(a.frozen ?? "0"),
        lockedAmount: String(a.lockedAmount ?? "0"),
        blockHeight: String(a.blockHeight ?? ""),
        blockHash: String(a.blockHash ?? ""),
      })),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapVaultWallet(raw: any): VaultWallet {
    return {
      id: String(raw.id ?? ""),
      address: String(raw.address ?? ""),
      description: String(raw.description ?? ""),
      tag: String(raw.tag ?? ""),
      type: String(raw.type ?? ""),
      customerRefId: raw.customerRefId as string | undefined,
      addressFormat: raw.addressFormat as string | undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTransaction(raw: any): TransactionResponse {
    return {
      id: String(raw.id ?? ""),
      status: String(
        raw.status ?? "SUBMITTED",
      ) as TransactionResponse["status"],
      subStatus: raw.subStatus as string | undefined,
      txHash: raw.txHash as string | undefined,
      operation: String(
        raw.operation ?? "TRANSFER",
      ) as TransactionResponse["operation"],
      source: this.mapPeerPath(raw.source ?? {}),
      destination: this.mapPeerPath(raw.destination ?? {}),
      amount: String(raw.amount ?? "0"),
      assetId: String(raw.assetId ?? ""),
      fee: raw.fee != null ? String(raw.fee) : undefined,
      networkFee: raw.networkFee != null ? String(raw.networkFee) : undefined,
      note: raw.note as string | undefined,
      createdAt: Number(raw.createdAt ?? 0),
      lastUpdated: Number(raw.lastUpdated ?? 0),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPeerPath(raw: any): TransferPeerPath {
    return {
      type: String(raw.type ?? "VAULT_ACCOUNT") as TransferPeerPath["type"],
      id: raw.id as string | undefined,
      name: raw.name as string | undefined,
      address: raw.address as string | undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPeerPathToSdk(peer: TransferPeerPath): any {
    return {
      type: peer.type,
      id: peer.id,
      name: peer.name,
      oneTimeAddress: peer.address ? { address: peer.address } : undefined,
    };
  }
}
