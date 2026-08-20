/**
 * Flow SDK Wrapper.
 *
 * SSR-safe wrapper around Dynamic's Flow SDK surface. Forked from
 * apps/shop/lib/checkout-sdk.ts — the canonical reference for using the
 * real Checkout Transaction API at SDK v0.25+. Keep the two files
 * roughly in sync; divergences here are deliberate (no exchange-specific
 * helpers, no balance polling primitives the shop adds for its product
 * catalog).
 */

import {
  // Auth
  isSignedIn as sdkIsSignedIn,
  logout as sdkLogout,
  // Wallet
  getPrimaryWalletAccount as sdkGetPrimaryWalletAccount,
  getWalletAccounts as sdkGetWalletAccounts,
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  connectWithWalletProvider as sdkConnectWithWalletProvider,
  getWalletProviderDataByKey as sdkGetWalletProviderDataByKey,
  // Balances
  getBalances as sdkGetBalances,
  // Network
  getActiveNetworkData as sdkGetActiveNetworkData,
  getNetworksData as sdkGetNetworksData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  // Flow (attach → quote → submit → poll). Step 1 still uses the
  // deprecated createCheckoutTransaction bridge when a reusable Checkout
  // config id + per-session amount are supplied by the host.
  createCheckoutTransaction as sdkCreateCheckoutTransaction,
  attachFlowSource as sdkAttachFlowSource,
  getFlowQuote as sdkGetFlowQuote,
  submitFlowTransaction as sdkSubmitFlowTransaction,
  getFlow as sdkGetFlow,
  cancelFlow as sdkCancelFlow,
  // WalletConnect catalog
  getWalletConnectCatalog as sdkGetWalletConnectCatalog,
  // Exchange / Social OAuth
  authenticateWithSocial as sdkAuthenticateWithSocial,
  completeSocialAuthentication as sdkCompleteSocialAuthentication,
  detectOAuthRedirect as sdkDetectOAuthRedirect,
  getUserSocialAccounts as sdkGetUserSocialAccounts,
  // Kraken funding
  getKrakenAccounts as sdkGetKrakenAccounts,
  getKrakenWhitelistedAddresses as sdkGetKrakenWhitelistedAddresses,
  createKrakenExchangeTransfer as sdkCreateKrakenExchangeTransfer,
  type KrakenAccount,
  type KrakenTransferRequest,
  type ExchangeTransferResponse,
  type TransferDestinationResponse,
  type GetKrakenAccountsParams,
  // Events
  onEvent as sdkOnEvent,
  offEvent as sdkOffEvent,
  // Types
  type WalletAccount,
  type WalletProviderData,
  type Chain,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
  type CheckoutExecutionState,
  type CheckoutSettlementState,
  type Flow,
  type OnEventParams,
  type OffEventParams,
  type WalletConnectCatalog,
  type WalletConnectCatalogWallet,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  isWaasWalletAccount as sdkIsWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import { waitForDynamicClientInitialized } from "./client";
import { connectAndVerifyWithWalletConnectEvm as sdkConnectAndVerifyWithWalletConnectEvm } from "@dynamic-labs-sdk/evm/wallet-connect";

export type {
  WalletAccount,
  WalletProviderData,
  Chain,
  Flow,
  CheckoutTransaction,
  CheckoutTransactionCreateResponse,
  CheckoutExecutionState,
  CheckoutSettlementState,
  OnEventParams,
  OffEventParams,
  WalletConnectCatalog,
  WalletConnectCatalogWallet,
  KrakenAccount,
  KrakenTransferRequest,
  ExchangeTransferResponse,
  TransferDestinationResponse,
  GetKrakenAccountsParams,
};

/**
 * WalletConnect — discovered wallet catalog. Powers the "more wallets"
 * affordance in the connect-wallet picker. Returns null on the server.
 */
export async function getWalletConnectCatalog(): Promise<WalletConnectCatalog | null> {
  if (typeof window === "undefined") return null;
  try {
    return await sdkGetWalletConnectCatalog();
  } catch {
    return null;
  }
}

export async function connectAndVerifyWithWalletConnectEvm() {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletConnectEvm();
}

// =============================================================================
// EVENTS
// =============================================================================

export const onEvent: typeof sdkOnEvent = (params) => sdkOnEvent(params);
export const offEvent: typeof sdkOffEvent = (params) => sdkOffEvent(params);

// =============================================================================
// AUTH
// =============================================================================

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sdkIsSignedIn();
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await sdkLogout();
  } catch {
    // Best-effort — the caller just wants to clear wallet state.
  }
}

// =============================================================================
// WALLET
// =============================================================================

export function getPrimaryWalletAccount(): WalletAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const primary = sdkGetPrimaryWalletAccount();
    if (primary) return primary;
    const accounts = sdkGetWalletAccounts();
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export function getAvailableWalletProvidersData(): WalletProviderData[] {
  if (typeof window === "undefined") return [];
  try {
    return sdkGetAvailableWalletProvidersData() || [];
  } catch {
    return [];
  }
}

export async function connectAndVerifyWithWalletProvider(params: {
  walletProviderKey: string;
}) {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletProvider(params);
}

export async function connectWithWalletProvider(params: {
  walletProviderKey: string;
}) {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkConnectWithWalletProvider(params);
}

export function getWalletDisplayName(wallet: WalletAccount): string {
  try {
    const provider = sdkGetWalletProviderDataByKey({
      walletProviderKey: wallet.walletProviderKey,
    });
    return provider?.metadata.displayName ?? "your wallet";
  } catch {
    return "your wallet";
  }
}

// =============================================================================
// WAAS (Wallet-as-a-Service) — embedded wallet provisioning
// =============================================================================

/**
 * Base mainnet — the chain we anchor the EVM platform wallet on. USDC
 * on Base is the canonical balance asset and settlement target. Kept
 * as a local constant rather than referencing the widget package's
 * chain registry because flow-sdk.ts is the lower-level layer.
 */
const PLATFORM_WALLET_NETWORK_ID = "8453";

/**
 * WaaS provisioning poll budget — `createWaasWalletAccounts` resolves
 * before the SDK's internal accounts list reflects the new wallet, so
 * we briefly poll for it to surface. Total wall-clock budget is
 * `WAAS_POLL_ATTEMPTS × WAAS_POLL_INTERVAL_MS` (~2s).
 */
const WAAS_POLL_ATTEMPTS = 8;
const WAAS_POLL_INTERVAL_MS = 250;

/**
 * Find an existing embedded WaaS wallet on the given chain.
 *
 * `isWaasWalletAccount` filters out external wallets (Phantom,
 * MetaMask, Fireblocks, etc.) that share the same `chain` value but
 * aren't Dynamic-provisioned embedded wallets.
 */
function findEmbeddedWallet(chain: "EVM" | "SOL"): WalletAccount | null {
  const accounts = sdkGetWalletAccounts();
  return (
    accounts.find(
      (acc) =>
        acc.chain === chain && sdkIsWaasWalletAccount({ walletAccount: acc }),
    ) ?? null
  );
}

/**
 * Switch an EVM wallet's active network to Base. Idempotent — calling
 * with the already-active network is a no-op. Errors are swallowed:
 * a network-switch failure is non-fatal because the balance hook
 * reads with an explicit `networkId` and the source-attach step
 * queries `getActiveNetworkData` regardless.
 */
async function ensureWalletOnBase(walletAccount: WalletAccount): Promise<void> {
  try {
    await sdkSwitchActiveNetwork({
      walletAccount,
      networkId: PLATFORM_WALLET_NETWORK_ID,
    });
  } catch {
    // Best-effort.
  }
}

/**
 * Ensure the signed-in user has an embedded WaaS wallet on the given
 * chain. Looks up an existing one first; if missing, force-creates
 * via `createWaasWalletAccounts({ chains: [chain] })` and polls for
 * it to surface in the SDK's accounts list.
 *
 * ## Why no `getChainsMissingWaasWalletAccounts` guard
 *
 * The Dynamic JS SDK quickstart explicitly recommends calling
 * `createWaasWalletAccounts` unconditionally after auth and warns
 * against guarding off the accounts list: the SDK's internal view
 * of "what chains are missing" can be stale immediately after the
 * connect/verify flow completes, leading to a silent skip and no
 * wallet being created. Some env configurations also omit chains
 * from `getChainsMissingWaasWalletAccounts` even when WaaS is
 * actually enabled in the dashboard.
 *
 * We DO short-circuit when `findEmbeddedWallet` returns an existing
 * one — `isWaasWalletAccount` is a reliable per-account check that
 * doesn't depend on the SDK's chain-level state, keeping returning
 * users from minting duplicate wallets.
 *
 * ## Failure modes
 *
 *   - User isn't signed in yet (`createWaasWalletAccounts` rejects).
 *   - Chain extension isn't registered (`NoWalletProviderFoundError`).
 *   - Embedded wallets aren't enabled for the chain in the env.
 *   - Creation succeeds but the SDK's accounts list doesn't update
 *     before our poll loop expires (defensive — shouldn't happen
 *     in practice).
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts
 */
async function ensureEmbeddedWallet(
  chain: "EVM" | "SOL",
  /** Optional post-provision hook. Used by the EVM caller to switch
   *  the wallet's active network to Base before handing it back. */
  onProvisioned?: (walletAccount: WalletAccount) => Promise<void>,
): Promise<WalletAccount> {
  if (typeof window === "undefined") {
    throw new Error("Dynamic client not initialized");
  }

  // Fast path: returning users already have one. Still run the
  // post-provision hook every time — the SDK may have rehydrated the
  // wallet with stale state from a prior session.
  const existing = findEmbeddedWallet(chain);
  if (existing) {
    if (onProvisioned) await onProvisioned(existing);
    return existing;
  }

  // Force-create — see the docstring above for why we don't gate on
  // `getChainsMissingWaasWalletAccounts`.
  await sdkCreateWaasWalletAccounts({ chains: [chain as Chain] });

  // Poll briefly for the SDK's internal accounts list to surface the
  // freshly-minted wallet.
  for (let attempt = 0; attempt < WAAS_POLL_ATTEMPTS; attempt++) {
    const created = findEmbeddedWallet(chain);
    if (created) {
      if (onProvisioned) await onProvisioned(created);
      return created;
    }
    await new Promise((resolve) => setTimeout(resolve, WAAS_POLL_INTERVAL_MS));
  }

  throw new Error(
    `${chain} embedded wallet did not appear after creation. Ensure embedded wallets are enabled for ${chain} in your Dynamic environment.`,
  );
}

/**
 * Ensure the signed-in user has a Solana embedded WaaS wallet. Used
 * by flows that anchor the platform wallet on Solana (kept alongside
 * the EVM variant for future re-enablement). See {@link ensureEmbeddedWallet}.
 */
export async function ensureSolEmbeddedWallet(): Promise<WalletAccount> {
  return ensureEmbeddedWallet("SOL");
}

/**
 * Ensure the signed-in user has an EVM embedded WaaS wallet pinned to
 * Base (chainId 8453). The post-provision step is the load-bearing
 * difference vs SOL: without `switchActiveNetwork({ networkId: 8453 })`
 * the SDK's WaaS EVM provider defaults to Ethereum mainnet (chainId 1),
 * and the Dashboard balance hits `/balances?networkId=1` instead of
 * Base.
 *
 * This is the DEFAULT platform-wallet provider for /withdraw because
 * Dynamic's EVM Checkouts path avoids the Solana-specific SDK gaps
 * (gas sponsorship not honored by `solanaExecuteSwapTransaction`,
 * blockhash RPC mismatch between Dynamic's server-side RPC and the
 * customer-configured client RPC).
 */
export async function ensureEvmEmbeddedWallet(): Promise<WalletAccount> {
  return ensureEmbeddedWallet("EVM", ensureWalletOnBase);
}

// =============================================================================
// BALANCES + NETWORK
// =============================================================================

export async function getBalances(params: {
  walletAccount: WalletAccount;
  /**
   * Pin the fetch to a specific EVM network id (e.g. 8453 for Base).
   * When omitted, the SDK falls back to the wallet's "active
   * network" which defaults to Ethereum mainnet (chainId 1) for
   * freshly-minted EVM WaaS wallets — surfacing as empty balances
   * for any consumer (deposit, withdraw, dashboard) that actually
   * holds funds on a different chain. Always pass this for
   * deterministic chain-scoped balance reads.
   */
  networkId?: number;
  includeNative?: boolean;
  includePrices?: boolean;
  filterSpamTokens?: boolean;
  /**
   * Force a fresh fetch instead of returning Dynamic's cached
   * balance. Used by the dashboard's refresh button so users can
   * see balance updates that hit the chain after the last cache
   * fill (e.g. a just-completed deposit).
   */
  forceRefresh?: boolean;
}) {
  if (typeof window === "undefined") return [];
  return sdkGetBalances(params);
}

export async function getActiveNetworkData(params: {
  walletAccount: WalletAccount;
}) {
  return sdkGetActiveNetworkData(params);
}

export function getNetworksData() {
  if (typeof window === "undefined") return [];
  try {
    return sdkGetNetworksData() || [];
  } catch {
    return [];
  }
}

export async function switchActiveNetwork(params: {
  walletAccount: WalletAccount;
  networkId: string;
}) {
  return sdkSwitchActiveNetwork(params);
}

// =============================================================================
// CHECKOUT TRANSACTION API
// =============================================================================

export async function createCheckoutTransaction(params: {
  amount: string;
  currency: string;
  checkoutId?: string;
  memo?: object;
}): Promise<CheckoutTransactionCreateResponse> {
  return sdkCreateCheckoutTransaction(params);
}

export async function attachCheckoutTransactionSource(params: {
  transactionId: string;
  fromAddress: string;
  fromChainId: string;
  fromChainName: Chain;
}): Promise<Flow> {
  const { flow } = await sdkAttachFlowSource({
    flowId: params.transactionId,
    fromAddress: params.fromAddress,
    fromChainId: params.fromChainId,
    fromChainName: params.fromChainName,
    sourceType: "wallet",
  });
  return flow;
}

/** The API rejects a deposit_address source without a refundAddress. */
export async function attachDepositAddressSource(params: {
  transactionId: string;
  fromChainId: string;
  fromChainName: Chain;
  refundAddress: string;
}): Promise<Flow> {
  const { flow } = await sdkAttachFlowSource({
    flowId: params.transactionId,
    fromChainId: params.fromChainId,
    fromChainName: params.fromChainName,
    refundAddress: params.refundAddress,
    sourceType: "deposit_address",
  });
  return flow;
}

export async function getCheckoutTransactionQuote(params: {
  transactionId: string;
  /** Omit for native assets - the quote defaults to the source chain's native token. */
  fromTokenAddress?: string;
  fromChainId?: string;
  slippage?: number;
}): Promise<Flow> {
  return sdkGetFlowQuote({
    flowId: params.transactionId,
    fromTokenAddress: params.fromTokenAddress,
    fromChainId: params.fromChainId,
    slippage: params.slippage,
  });
}

export async function submitCheckoutTransaction(params: {
  transactionId: string;
  walletAccount: WalletAccount;
  onStepChange?: (step: "approval" | "transaction") => void;
}): Promise<Flow> {
  return sdkSubmitFlowTransaction({
    flowId: params.transactionId,
    walletAccount: params.walletAccount,
    onStepChange: params.onStepChange,
  });
}

export async function getCheckoutTransaction(params: {
  transactionId: string;
}): Promise<Flow> {
  return sdkGetFlow({ flowId: params.transactionId });
}

export async function cancelCheckoutTransaction(params: {
  transactionId: string;
}): Promise<Flow> {
  return sdkCancelFlow({ flowId: params.transactionId });
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const TERMINAL_EXECUTION_STATES: CheckoutExecutionState[] = [
  "cancelled",
  "expired",
  "failed",
];
const TERMINAL_SETTLEMENT_STATES: CheckoutSettlementState[] = [
  "completed",
  "failed",
];

export function isTerminalState(tx: Flow | CheckoutTransaction): boolean {
  if (
    TERMINAL_EXECUTION_STATES.includes(
      tx.executionState as CheckoutExecutionState,
    ) ||
    TERMINAL_SETTLEMENT_STATES.includes(
      tx.settlementState as CheckoutSettlementState,
    )
  ) {
    return true;
  }
  if (
    tx.executionState === "source_confirmed" &&
    tx.settlementState === "none"
  ) {
    return true;
  }
  return false;
}

export function isSuccessState(tx: Flow | CheckoutTransaction): boolean {
  return (
    tx.settlementState === "completed" ||
    (tx.executionState === "source_confirmed" && tx.settlementState === "none")
  );
}

export function isFailedState(tx: Flow | CheckoutTransaction): boolean {
  return tx.executionState === "failed" || tx.settlementState === "failed";
}

// =============================================================================
// EXCHANGE / SOCIAL OAUTH
// =============================================================================

export async function authenticateWithSocial(params: {
  provider: string;
  redirectUrl: string;
}): Promise<void> {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkAuthenticateWithSocial({
    provider: params.provider as Parameters<
      typeof sdkAuthenticateWithSocial
    >[0]["provider"],
    redirectUrl: params.redirectUrl,
  });
}

export async function detectOAuthRedirect(url?: URL): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await waitForDynamicClientInitialized();
    const currentUrl = url ?? new URL(window.location.href);
    return sdkDetectOAuthRedirect({ url: currentUrl });
  } catch {
    return false;
  }
}

export async function completeSocialAuthentication(
  url?: URL,
): Promise<unknown> {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  await waitForDynamicClientInitialized();
  const currentUrl = url ?? new URL(window.location.href);
  return sdkCompleteSocialAuthentication({ url: currentUrl });
}

export interface SocialAccount {
  accountId?: string;
  displayName?: string;
  emails: string[];
  photos: string[];
  provider: string;
  username?: string;
  verifiedCredentialId: string;
}

export function getUserSocialAccounts(): SocialAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return sdkGetUserSocialAccounts() as SocialAccount[];
  } catch {
    return [];
  }
}

// =============================================================================
// KRAKEN EXCHANGE
// =============================================================================

export async function getKrakenAccounts(
  params?: GetKrakenAccountsParams,
): Promise<KrakenAccount[]> {
  if (typeof window === "undefined") return [];
  return sdkGetKrakenAccounts(params);
}

export async function getKrakenWhitelistedAddresses(): Promise<TransferDestinationResponse> {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkGetKrakenWhitelistedAddresses();
}

export async function createKrakenExchangeTransfer(
  params: KrakenTransferRequest,
): Promise<ExchangeTransferResponse> {
  if (typeof window === "undefined")
    throw new Error("Dynamic client not initialized");
  return sdkCreateKrakenExchangeTransfer(params);
}
