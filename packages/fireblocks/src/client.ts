/**
 * Fireblocks API Client
 *
 * Wraps the official @fireblocks/ts-sdk with our simplified types.
 *
 * The public surface is namespaced — `fb.vault.*`, `fb.transactions.*`,
 * `fb.internalWallets.*`, `fb.orders.*`, `fb.compliance.*`,
 * `fb.providers.*`, plus the `fb.sdk` (raw SDK) and `fb.api` (raw REST)
 * escape hatches. The actual SDK call bodies are unchanged from the
 * previous flat client; this file only reorganizes them.
 */

import { Fireblocks, type BasePath } from "@fireblocks/ts-sdk";

import { createApiClient, type FireblocksApiClient } from "./api";
import type { IFireblocksClient } from "./client-interface";
import { createComplianceModule, type ComplianceModule } from "./compliance";
import {
  createOrdersNamespace,
  type OrdersNamespace,
  type ProviderEnvironment,
} from "./orders";
import * as alfredpay from "./providers/alfredpay";
import * as mtlco from "./providers/mtlco";
import type {
  FireblocksConfig,
  InternalWalletsNamespace,
  TransactionsNamespace,
  TransferPeerPath,
  VaultAccount,
  VaultAsset,
  VaultWallet,
  TransactionResponse,
  DepositAddress,
  InternalWalletSummary,
  VaultAccountsTagAttachmentOperationsRequest,
  VaultAccountsTagAttachmentOperationsResponse,
  VaultNamespace,
} from "./types";

export class FireblocksClient implements IFireblocksClient {
  readonly sdk: Fireblocks;
  readonly vault: VaultNamespace;
  readonly transactions: TransactionsNamespace;
  readonly internalWallets: InternalWalletsNamespace;
  readonly orders: OrdersNamespace;
  readonly compliance: ComplianceModule;
  readonly providers: { mtlco: typeof mtlco; alfredpay: typeof alfredpay };
  readonly api: FireblocksApiClient;

  constructor(config: FireblocksConfig) {
    this.sdk = new Fireblocks({
      apiKey: config.apiKey,
      secretKey: config.apiSecret,
      basePath: config.baseUrl as BasePath,
    });

    // ─── vault ────────────────────────────────────────────────────────────
    this.vault = {
      createAccount: async (
        name: string,
        opts?: { hiddenOnUI?: boolean; customerRefId?: string; autoFuel?: boolean },
      ): Promise<VaultAccount> => {
        const res = await this.sdk.vaults.createVaultAccount({
          createVaultAccountRequest: {
            name,
            hiddenOnUI: opts?.hiddenOnUI ?? false,
            autoFuel: opts?.autoFuel ?? false,
            ...(opts?.customerRefId ? { customerRefId: opts.customerRefId } : {}),
          },
        });
        return this.mapVaultAccount(res.data);
      },

      getAccount: async (vaultId: string): Promise<VaultAccount> => {
        const res = await this.sdk.vaults.getVaultAccount({
          vaultAccountId: vaultId,
        });
        return this.mapVaultAccount(res.data);
      },

      listAccounts: async (limit = 50): Promise<VaultAccount[]> => {
        const res = await this.sdk.vaults.getPagedVaultAccounts({ limit });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (res.data.accounts ?? []).map((a: any) => this.mapVaultAccount(a));
      },

      hideAccount: async (vaultId: string): Promise<void> => {
        await this.sdk.vaults.hideVaultAccount({ vaultAccountId: vaultId });
      },

      setCustomerRefId: async (
        vaultId: string,
        customerRefId: string,
      ): Promise<void> => {
        await this.sdk.vaults.setVaultAccountCustomerRefId({
          vaultAccountId: vaultId,
          setCustomerRefIdRequest: { customerRefId },
        });
      },

      attachOrDetachTags: async (
        request: VaultAccountsTagAttachmentOperationsRequest,
        opts?: { idempotencyKey?: string },
      ): Promise<VaultAccountsTagAttachmentOperationsResponse> => {
        const res = await this.sdk.vaults.attachOrDetachTagsFromVaultAccounts({
          vaultAccountsTagAttachmentOperationsRequest: {
            vaultAccountIds: request.vaultAccountIds,
            tagIdsToAttach: request.tagIdsToAttach,
            tagIdsToDetach: request.tagIdsToDetach,
          },
          idempotencyKey: opts?.idempotencyKey,
        });
        return res.data as VaultAccountsTagAttachmentOperationsResponse;
      },

      createWallet: async (
        vaultId: string,
        assetId: string,
      ): Promise<VaultWallet> => {
        const res = await this.sdk.vaults.createVaultAccountAsset({
          vaultAccountId: vaultId,
          assetId,
        });
        return this.mapVaultWallet(res.data);
      },

      getDepositAddresses: async (
        vaultId: string,
        assetId: string,
      ): Promise<DepositAddress[]> => {
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
      },

      createDepositAddress: async (
        vaultId: string,
        assetId: string,
        opts?: { description?: string; customerRefId?: string },
      ): Promise<DepositAddress> => {
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
      },

      getAssetBalance: async (
        vaultId: string,
        assetId: string,
      ): Promise<VaultAsset> => {
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
      },
    };

    // ─── transactions ─────────────────────────────────────────────────────
    this.transactions = {
      create: async (request): Promise<TransactionResponse> => {
        const res = await this.sdk.transactions.createTransaction({
          transactionRequest: {
            assetId: request.assetId,
            amount: request.amount,
            source: this.mapPeerPathToSdk(request.source),
            destination: this.mapPeerPathToSdk(request.destination),
            externalTxId: request.externalTxId,
            note: request.note,
            customerRefId: request.customerRefId,
            ...(request.useGasless !== undefined
              ? { useGasless: request.useGasless }
              : {}),
          },
        });
        // createTransaction returns a minimal response (id + status).
        // Fetch the full transaction to return our complete type.
        const txId = String(res.data.id);
        return this.transactions.get(txId);
      },

      get: async (txId: string): Promise<TransactionResponse> => {
        const res = await this.sdk.transactions.getTransaction({ txId });
        return this.mapTransaction(res.data);
      },

      getByExternalId: async (
        externalTxId: string,
      ): Promise<TransactionResponse | null> => {
        try {
          const res = await this.sdk.transactions.getTransactionByExternalId({
            externalTxId,
          });
          return this.mapTransaction(res.data);
        } catch (err: unknown) {
          if (FireblocksClient.isNotFoundError(err)) return null;
          throw err;
        }
      },

      list: async (params): Promise<TransactionResponse[]> => {
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
      },
    };

    // ─── internalWallets ──────────────────────────────────────────────────
    this.internalWallets = {
      list: async (): Promise<InternalWalletSummary[]> => {
        const res = await this.sdk.internalWallets.getInternalWallets();
        const list = Array.isArray(res.data) ? res.data : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return list.map((w: any) => ({
          id: String(w.id ?? ""),
          name: String(w.name ?? ""),
          customerRefId:
            w.customerRefId != null ? String(w.customerRefId) : undefined,
        }));
      },

      get: async (walletId: string) => {
        const res = await this.sdk.internalWallets.getInternalWallet({
          walletId,
        });
        const d = res.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assets = (d.assets ?? []).map((a: any) => {
          const id = String(a.id ?? "");
          const raw = a.address ?? a.baseAssetAddress;
          const address =
            raw != null && String(raw).trim() !== ""
              ? String(raw).trim()
              : undefined;
          return { id, address };
        });
        return { id: String(d.id ?? ""), assets };
      },

      create: async (
        name: string,
        opts?: { customerRefId?: string },
      ): Promise<{ id: string }> => {
        const res = await this.sdk.internalWallets.createInternalWallet({
          createWalletRequest: {
            name,
            customerRefId: opts?.customerRefId,
          },
        });
        return { id: String(res.data.id ?? "") };
      },

      createAsset: async (
        walletId: string,
        assetId: string,
        address: string,
      ): Promise<void> => {
        await this.sdk.internalWallets.createInternalWalletAsset({
          walletId,
          assetId,
          createInternalWalletAssetRequest: { address },
        });
      },
    };

    // ─── orders ───────────────────────────────────────────────────────────
    // Heuristic: production base path → production env; else sandbox.
    const env: ProviderEnvironment = /api\.fireblocks\.io/.test(config.baseUrl)
      ? "production"
      : "sandbox";
    this.orders = createOrdersNamespace({
      apiKey: config.apiKey,
      apiSecretPem: config.apiSecret,
      env,
    });

    // ─── compliance ───────────────────────────────────────────────────────
    // The SDK's compliance module shape is internal; cast through `never`
    // and let `compliance.ts` defensively read the response.
    this.compliance = createComplianceModule({ sdk: this.sdk as never });

    // ─── providers ────────────────────────────────────────────────────────
    this.providers = { mtlco, alfredpay };

    // ─── api (raw REST escape hatch) ──────────────────────────────────────
    this.api = createApiClient({
      apiKey: config.apiKey,
      secretKey: config.apiSecret,
      basePath: config.baseUrl,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isNotFoundError(err: unknown): boolean {
    if (err === null || typeof err !== "object") return false;
    const resp = (
      err as { response?: { status?: unknown; statusCode?: unknown } }
    ).response;
    return resp?.statusCode === 404 || resp?.status === 404;
  }

  // ─── Private mappers ───────────────────────────────────────────────────────
  // SDK response types are complex; we normalize to our simplified types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapVaultAccount(raw: any): VaultAccount {
    const assets = Array.isArray(raw.assets) ? raw.assets : [];
    const tagList = Array.isArray(raw.tags) ? raw.tags : [];
    return {
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      hiddenOnUI: Boolean(raw.hiddenOnUI),
      autoFuel: Boolean(raw.autoFuel),
      customerRefId:
        raw.customerRefId != null && raw.customerRefId !== ""
          ? String(raw.customerRefId)
          : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: tagList.map((t: any) => ({
        id: String(t.id ?? ""),
        isProtected: Boolean(t.isProtected),
      })),
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
      externalTxId: raw.externalTxId as string | undefined,
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
      amlScreening: FireblocksClient.mapAmlScreening(raw),
      travelRuleScreening: FireblocksClient.mapTravelRuleScreening(raw),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mapAmlScreening(
    raw: any,
  ): TransactionResponse["amlScreening"] {
    const aml =
      raw?.amlScreeningResult ??
      raw?.complianceResults?.aml ??
      (Array.isArray(raw?.complianceResults?.amlList) &&
      raw.complianceResults.amlList.length > 0
        ? raw.complianceResults.amlList[0]
        : undefined);
    if (!aml || typeof aml !== "object") return undefined;
    const provider =
      aml.provider != null && String(aml.provider).trim() !== ""
        ? String(aml.provider)
        : "";
    const screeningStatus =
      aml.screeningStatus != null && String(aml.screeningStatus).trim() !== ""
        ? String(aml.screeningStatus)
        : "";
    if (!provider && !screeningStatus) return undefined;
    return {
      provider: provider || "—",
      screeningStatus: screeningStatus || "—",
      verdict:
        aml.verdict != null && String(aml.verdict).trim() !== ""
          ? String(aml.verdict)
          : undefined,
      bypassReason:
        aml.bypassReason != null && String(aml.bypassReason).trim() !== ""
          ? String(aml.bypassReason)
          : undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mapTravelRuleScreening(
    raw: any,
  ): TransactionResponse["travelRuleScreening"] {
    const tr = raw?.complianceResults?.tr;
    if (!tr || typeof tr !== "object") return undefined;
    const provider =
      tr.provider != null && String(tr.provider).trim() !== ""
        ? String(tr.provider)
        : "";
    const status =
      tr.status != null && String(tr.status).trim() !== ""
        ? String(tr.status)
        : "";
    if (!provider && !status) return undefined;
    return {
      provider: provider || "—",
      status: status || "—",
      verdict:
        tr.verdict != null && String(tr.verdict).trim() !== ""
          ? String(tr.verdict)
          : undefined,
      bypassReason:
        tr.bypassReason != null && String(tr.bypassReason).trim() !== ""
          ? String(tr.bypassReason)
          : undefined,
    };
  }

  /** Fireblocks peers may put the chain address in `address` or only in `oneTimeAddress.address`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPeerPath(raw: any): TransferPeerPath {
    const a =
      (typeof raw?.address === "string" ? raw.address.trim() : "") ||
      (typeof raw?.oneTimeAddress?.address === "string"
        ? raw.oneTimeAddress.address.trim()
        : "");
    return {
      type: String(raw.type ?? "VAULT_ACCOUNT") as TransferPeerPath["type"],
      id: raw.id as string | undefined,
      name: raw.name as string | undefined,
      address: a || undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPeerPathToSdk(peer: TransferPeerPath): any {
    const out: Record<string, unknown> = {
      type: peer.type,
      id: peer.id,
      name: peer.name,
      oneTimeAddress: peer.address ? { address: peer.address } : undefined,
    };
    if (peer.type === "INTERNAL_WALLET" && peer.id) {
      out.walletId = peer.id;
    }
    return out;
  }
}
