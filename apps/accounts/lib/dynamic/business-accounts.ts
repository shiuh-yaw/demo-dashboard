"use client";

/**
 * Business Accounts - the whole SDK surface this demo drives.
 *
 * A business account owns wallets and separates two kinds of reach:
 *   - members administer the account (owner / admin / viewer),
 *   - signers hold an MPC key share for one wallet and can sign with it.
 * Being an admin does not let you sign; being a signer grants no admin rights.
 *
 * Early access: gated by the `enable-business-accounts` flag on the Dynamic
 * environment. Without it every call below returns 403.
 *
 * Every mutation except create / rename / wallet-create is gated on a scoped
 * elevated access token - see `./step-up` and `hooks/use-step-up.ts`.
 *
 * @see https://www.dynamic.xyz/docs/api-reference/sdk/sdk-%E2%80%94-create-a-business-account
 */

import type { Chain, WalletAccount } from "@dynamic-labs-sdk/client";
import {
  addBusinessAccountMember as sdkAddBusinessAccountMember,
  addBusinessAccountSigner as sdkAddBusinessAccountSigner,
  addWalletToBusinessAccount as sdkAddWalletToBusinessAccount,
  createBusinessAccount as sdkCreateBusinessAccount,
  createWalletForBusinessAccount as sdkCreateWalletForBusinessAccount,
  getBusinessAccount as sdkGetBusinessAccount,
  listBusinessAccounts as sdkListBusinessAccounts,
  removeBusinessAccountMember as sdkRemoveBusinessAccountMember,
  removeBusinessAccountSigner as sdkRemoveBusinessAccountSigner,
  removeBusinessAccountWallet as sdkRemoveBusinessAccountWallet,
  transferBusinessAccountOwnership as sdkTransferBusinessAccountOwnership,
  updateBusinessAccount as sdkUpdateBusinessAccount,
  updateBusinessAccountMemberRole as sdkUpdateBusinessAccountMemberRole,
  type BusinessAccount,
  type BusinessAccountDetail,
  type BusinessAccountList,
  type BusinessAccountMember,
  type BusinessAccountSigner,
  type BusinessAccountWalletSummary,
  type TargetIdentity,
} from "@dynamic-labs-sdk/client/waas";
import { getClient } from "./client";

export type {
  BusinessAccount,
  BusinessAccountDetail,
  BusinessAccountList,
  BusinessAccountMember,
  BusinessAccountSigner,
  BusinessAccountWalletSummary,
  TargetIdentity,
};

/** Roles a member can be assigned. `owner` is reached only by transfer. */
export type AssignableRole = "admin" | "viewer";

function requireClient() {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return client;
}

// =============================================================================
// ACCOUNTS
// =============================================================================

/**
 * Create an account. The caller becomes its first `owner` member.
 *
 * @see https://www.dynamic.xyz/docs/api-reference/sdk/sdk-%E2%80%94-create-a-business-account
 */
export async function createBusinessAccount(params: {
  name?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
}): Promise<BusinessAccount> {
  return sdkCreateBusinessAccount(params);
}

/**
 * Accounts the signed-in user is a member of, in this environment.
 *
 * Unfiltered on purpose: the widget shows the whole roster. The SDK accepts an
 * `externalRefs` filter if a caller ever wants one account by ref.
 */
export async function listBusinessAccounts(): Promise<BusinessAccountList> {
  requireClient();
  return sdkListBusinessAccounts();
}

/** One account, expanded with its members, signers, and wallets. */
export async function getBusinessAccount(params: {
  businessAccountId: string;
}): Promise<BusinessAccountDetail> {
  requireClient();
  return sdkGetBusinessAccount(params);
}

/** Rename an account (owner / admin only). */
export async function updateBusinessAccount(params: {
  businessAccountId: string;
  name: string;
}): Promise<BusinessAccount> {
  requireClient();
  return sdkUpdateBusinessAccount(params);
}

// =============================================================================
// WALLETS
// =============================================================================

/**
 * Mint a new MPC wallet owned by the account outright - one step, no link
 * call: the server seats the wallet's signer row against the account as the
 * wallet is created. The SDK refreshes local auth itself so the new wallet
 * lands in this session's wallet accounts.
 */
export async function createWalletForBusinessAccount(params: {
  businessAccountId: string;
  chain: Chain;
}): Promise<unknown> {
  requireClient();
  return sdkCreateWalletForBusinessAccount(params);
}

/**
 * Bring an existing personal wallet under the account.
 *
 * `walletId` is the wallet's verified-credential id, NOT `WalletAccount.id`
 * (which is a composite `walletProviderKey:address`). No MPC ceremony runs -
 * the owner already holds a valid share set, so this transfers ownership and
 * registers the caller as owner member + signer.
 */
export async function addWalletToBusinessAccount(params: {
  businessAccountId: string;
  walletId: string;
}): Promise<BusinessAccountDetail> {
  requireClient();
  return sdkAddWalletToBusinessAccount(params);
}

/** Detach a wallet. The backend refuses to remove an account's last wallet. */
export async function removeBusinessAccountWallet(params: {
  businessAccountId: string;
  walletId: string;
}): Promise<BusinessAccountDetail> {
  requireClient();
  return sdkRemoveBusinessAccountWallet(params);
}

// =============================================================================
// SIGNERS
// =============================================================================

/**
 * Add a co-signer to one of the account's wallets via the reshare ceremony,
 * which mints the new signer's own share set.
 *
 * The caller must already sign for the wallet - only an existing share-holder
 * can reshare.
 *
 * `walletAccount` is passed as `{ address, chain }`: the reshare resolves the
 * WaaS provider by chain and reshares by address, and this path never touches
 * the other `WalletAccount` fields (verified above against the SDK's
 * `reshareToNewSignerShareSet`). Constructing the minimal shape lets a signer
 * be added to any business-account wallet the user can sign for, including
 * ones absent from this session's `getWalletAccounts()`. The cast is confined
 * to this function.
 */
export async function addBusinessAccountSigner(params: {
  businessAccountId: string;
  targetIdentity: TargetIdentity;
  wallet: { address: string; chain: string };
}): Promise<{ shareSetId: string }> {
  requireClient();
  return sdkAddBusinessAccountSigner({
    businessAccountId: params.businessAccountId,
    targetIdentity: params.targetIdentity,
    walletAccount: {
      address: params.wallet.address,
      chain: params.wallet.chain,
    } as unknown as WalletAccount,
  });
}

/**
 * Revoke a signer's ability to sign for one wallet.
 *
 * Only that signer's MPC pair is severed - the wallet and every other signer
 * survive untouched, because each share set is an independent pair. The
 * backend refuses to remove a wallet's last signer.
 */
export async function removeBusinessAccountSigner(params: {
  businessAccountId: string;
  signerId: string;
  walletId: string;
}): Promise<BusinessAccountSigner> {
  requireClient();
  return sdkRemoveBusinessAccountSigner(params);
}

// =============================================================================
// MEMBERS
// =============================================================================

/**
 * Add a member with a management role. Identify them by an existing `userId`,
 * or by an `identifier` + `identifierType` (the user is created if absent).
 */
export async function addBusinessAccountMember(params: {
  businessAccountId: string;
  targetIdentity: TargetIdentity;
  role: AssignableRole;
}): Promise<BusinessAccountMember> {
  requireClient();
  return sdkAddBusinessAccountMember(params);
}

/** Promote or demote a member between `admin` and `viewer`. */
export async function updateBusinessAccountMemberRole(params: {
  businessAccountId: string;
  userId: string;
  role: AssignableRole;
}): Promise<BusinessAccountMember> {
  requireClient();
  return sdkUpdateBusinessAccountMemberRole(params);
}

/**
 * Hand the account to another member: they become `owner`, the current owner
 * is atomically demoted to `admin`. Owner-only, and the target must already
 * be a member.
 */
export async function transferBusinessAccountOwnership(params: {
  businessAccountId: string;
  newOwnerUserId: string;
}): Promise<BusinessAccountDetail> {
  requireClient();
  return sdkTransferBusinessAccountOwnership(params);
}

/**
 * Remove a member. Every signer row that user held across the account's
 * wallets is torn down with them, so the backend refuses if it would leave
 * any wallet with zero signers.
 */
export async function removeBusinessAccountMember(params: {
  businessAccountId: string;
  userId: string;
}): Promise<BusinessAccountMember> {
  requireClient();
  return sdkRemoveBusinessAccountMember(params);
}
