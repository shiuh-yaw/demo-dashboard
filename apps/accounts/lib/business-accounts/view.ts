/**
 * Deriving what the UI may show and offer from a `BusinessAccountDetail`.
 *
 * Pure: the authorization questions ("can this user transfer ownership?",
 * "can they reshare this wallet?") are answered from the server's own view of
 * members and signers, never from local session state, so they stay correct
 * for wallets absent from `getWalletAccounts()`.
 */

import type {
  AssignableRole,
  BusinessAccount,
  BusinessAccountDetail,
  BusinessAccountMember,
  BusinessAccountSigner,
  BusinessAccountWalletSummary,
} from "@/lib/dynamic";

/**
 * The account's wallets.
 *
 * `detail.wallets` is a superset of the wallets signers reference - a wallet
 * exists before any signer row is minted on it. When the field is absent, fall
 * back to the ids the signers name; those entries carry no address or chain, so
 * they can be listed but not reshared from.
 */
export function walletsOf(
  detail: BusinessAccountDetail | undefined,
): BusinessAccountWalletSummary[] {
  if (!detail) return [];
  if (detail.wallets) return detail.wallets;
  const ids = new Set(
    (detail.signers ?? []).map((signer) => signer.walletId).filter(Boolean),
  );
  return [...ids].map((id) => ({ id }) as BusinessAccountWalletSummary);
}

/** The signers attached to one wallet. */
export function signersOf(
  detail: BusinessAccountDetail | undefined,
  walletId: string,
): BusinessAccountSigner[] {
  return (detail?.signers ?? []).filter(
    (signer) => signer.walletId === walletId,
  );
}

export function memberFor(
  detail: BusinessAccountDetail | undefined,
  userId: string | null,
): BusinessAccountMember | undefined {
  if (!userId) return undefined;
  return (detail?.members ?? []).find((member) => member.userId === userId);
}

/** Only the owner may transfer ownership. */
export function isOwner(
  detail: BusinessAccountDetail | undefined,
  userId: string | null,
): boolean {
  return memberFor(detail, userId)?.role === "owner";
}

/** Owners and admins may add members and change roles. */
export function canManageMembers(
  detail: BusinessAccountDetail | undefined,
  userId: string | null,
): boolean {
  const role = memberFor(detail, userId)?.role;
  return role === "owner" || role === "admin";
}

/**
 * Can this user add a signer to this wallet?
 *
 * A reshare has to start from a share the caller already holds, so the answer
 * is "they are an active signer on it" - `shareSetId` set, not merely a pending
 * signer row - and the wallet must expose an address and chain to reshare by.
 */
export function canAddSigner(
  detail: BusinessAccountDetail | undefined,
  userId: string | null,
  wallet: BusinessAccountWalletSummary,
): boolean {
  if (!userId || !wallet.publicKey || !wallet.chain) return false;
  return signersOf(detail, wallet.id).some(
    (signer) => signer.userId === userId && Boolean(signer.shareSetId),
  );
}

/** The backend refuses to remove a wallet's last signer. */
export function canRemoveSigner(
  detail: BusinessAccountDetail | undefined,
  wallet: BusinessAccountWalletSummary,
): boolean {
  return signersOf(detail, wallet.id).length > 1;
}

/**
 * Linking or detaching a wallet - owner or admin.
 *
 * Matches what the role picker promises ("Manage members, signers, wallet
 * links"); gating detach on owner alone contradicted our own copy, and made the
 * action vanish for anyone who had transferred ownership away. Not verified
 * against the server, which may still be owner-only - if it refuses, the confirm
 * step surfaces the error, which beats hiding an action we told them they have.
 */
export function canManageWallets(
  detail: BusinessAccountDetail | undefined,
  userId: string | null,
): boolean {
  return canManageMembers(detail, userId);
}

/** The backend refuses to remove an account's last wallet. */
export function canRemoveWallet(
  detail: BusinessAccountDetail | undefined,
): boolean {
  return walletsOf(detail).length > 1;
}

/**
 * Detach is switched off in the widget (observed 2026-08-06).
 *
 * The call itself works - the wallet does leave the account - but the token
 * refresh that follows it fails, so the session is dead by the time the call
 * returns. The widget cannot then read back the change it just caused: it
 * shows a 401 next to a list still holding the wallet, and the user finds it
 * gone only after signing in again. An action that succeeds while reporting
 * failure is worse than an action that isn't offered.
 *
 * Typed `boolean` rather than the literal so the guarded branches stay live
 * code. Flip to `true` when a detach leaves the session intact.
 */
export const WALLET_DETACH_ENABLED: boolean = false;

/**
 * Narrows the SDK's plain-`string` role to the two a role picker may set.
 *
 * `owner` is deliberately excluded: it moves by `transferOwnership`, not by
 * assignment, so a row showing `owner` gets no picker at all.
 */
export function assignableRole(
  role: string | null | undefined,
): AssignableRole | null {
  return role === "admin" || role === "viewer" ? role : null;
}

/** `0x1234…cdef`, for ids and addresses in dense rows. */
export function shorten(
  value: string | undefined | null,
  head = 6,
  tail = 4,
): string {
  if (!value) return "-";
  return value.length <= head + tail + 2
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}


/** Two-letter monogram for an account avatar. */
export function initials(value: string | null | undefined): string {
  const cleaned = (value ?? "").replace(/[^a-zA-Z0-9]/g, "");
  return cleaned ? cleaned.slice(0, 2).toUpperCase() : "??";
}

/** Display name for an account that may be unnamed. */
export function accountName(
  account: Pick<BusinessAccount, "name"> | undefined,
): string {
  return account?.name?.trim() || "Untitled account";
}
