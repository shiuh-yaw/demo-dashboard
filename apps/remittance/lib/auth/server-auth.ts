/**
 * Server-side auth and user data for page render.
 * Used to bypass client-side loading and KYC gate for already-verified users.
 */

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";
import {
  getUser,
  KYC_APPROVED_METADATA_KEY,
  BANK_DETAILS_SUBMITTED_METADATA_KEY,
  FIREBLOCKS_VAULT_METADATA_KEY,
  STUB_CARD_METADATA_KEY,
  CARD_DEPOSITS_METADATA_KEY,
  SAVE_DEPOSITS_METADATA_KEY,
} from "@/lib/dynamic-api";
import {
  isMetadataTruthy,
  getMetadataString,
  getPrimaryWalletAddress,
  getStubCardFromUser,
  getCardDepositsFromUser,
  getSaveDepositsFromUser,
} from "@/lib/user-metadata";
import { getKnownRecipientsFromUser } from "@/lib/recipients";
import type { RecipientEntry } from "@/lib/recipients";

export interface ServerAuthState {
  isLoggedIn: boolean;
  kycApproved: boolean;
}

export interface ServerUserData extends ServerAuthState {
  userId: string;
  walletAddress: string | null;
  /** Whether user has submitted bank details for withdrawals. */
  hasSubmittedBankDetails: boolean;
  /** Withdraw vault address from user metadata (avoids /api/withdraw/address fetch). */
  withdrawVaultAddress: string | null;
  /** Known recipients from user metadata (for Send modal, avoids loading). */
  knownRecipients: RecipientEntry[];
  /** Stub stablecoin debit card from user metadata (cardNumber, expiry). */
  stubCard: { cardNumber: string; expiry?: string } | null;
  /** Total card deposits from user metadata. Card balance = this value, starts at 0. */
  cardDeposits: number;
  /** Total save deposits from user metadata (additive only). */
  saveDeposits: number;
}

/**
 * Get auth and KYC status from server (cookies).
 * Call from server components to avoid client-side loading for KYC'd users.
 */
export async function getServerAuthState(): Promise<ServerAuthState | null> {
  const data = await getServerUserData({ redirectToLogin: false });
  return data
    ? { isLoggedIn: data.isLoggedIn, kycApproved: data.kycApproved }
    : null;
}

export interface GetServerUserDataOptions {
  /** When true (default), redirects to login when not authenticated. */
  redirectToLogin?: boolean;
  /** Custom login path. Defaults to "/" - the scenario front door is the login surface. */
  loginPath?: string;
}

/**
 * Get full user data from server (auth, KYC, wallet address).
 * When redirectToLogin is true (default), redirects to / when not authenticated.
 * Cached per-request so layout + page share the same fetch.
 */
export const getServerUserData = cache(async function getServerUserData(
  options?: GetServerUserDataOptions,
): Promise<ServerUserData | null> {
  const { redirectToLogin = true, loginPath = "/" } = options ?? {};
  const cookieStore = await cookies();
  const authUser = await getAuthenticatedUserFromCookies(cookieStore);

  const getRedirectUrl = async () => {
    if (!redirectToLogin) return loginPath;
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/";
    const returnTo = encodeURIComponent(
      pathname.startsWith("/") ? pathname : `/${pathname}`,
    );
    const separator = loginPath.includes("?") ? "&" : "?";
    return `${loginPath}${separator}returnTo=${returnTo}`;
  };

  if (!authUser) {
    if (redirectToLogin) {
      const url = await getRedirectUrl();
      const sep = url.includes("?") ? "&" : "?";
      redirect(`${url}${sep}sessionExpired=1`);
    }
    return null;
  }

  const userId = authUser.sub ?? authUser.userId ?? "";
  if (!userId) {
    if (redirectToLogin) {
      const url = await getRedirectUrl();
      const sep = url.includes("?") ? "&" : "?";
      redirect(`${url}${sep}sessionExpired=1`);
    }
    return null;
  }

  try {
    const user = await getUser(userId);
    const kycApproved = user
      ? isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY)
      : false;
    const hasSubmittedBankDetails = user
      ? isMetadataTruthy(user, BANK_DETAILS_SUBMITTED_METADATA_KEY)
      : false;
    const walletAddress = user ? getPrimaryWalletAddress(user) : null;
    const withdrawVaultAddress = user
      ? getMetadataString(user, FIREBLOCKS_VAULT_METADATA_KEY)
      : null;
    const knownRecipients = getKnownRecipientsFromUser(user);
    const stubCard = user
      ? getStubCardFromUser(user, STUB_CARD_METADATA_KEY)
      : null;
    const cardDeposits = getCardDepositsFromUser(
      user,
      CARD_DEPOSITS_METADATA_KEY,
    );
    const saveDeposits = getSaveDepositsFromUser(
      user,
      SAVE_DEPOSITS_METADATA_KEY,
    );
    return {
      isLoggedIn: true,
      kycApproved,
      userId,
      walletAddress,
      hasSubmittedBankDetails,
      withdrawVaultAddress,
      knownRecipients,
      stubCard,
      cardDeposits,
      saveDeposits,
    };
  } catch {
    return {
      isLoggedIn: true,
      kycApproved: false,
      userId,
      walletAddress: null,
      hasSubmittedBankDetails: false,
      withdrawVaultAddress: null,
      knownRecipients: [],
      stubCard: null,
      cardDeposits: 0,
      saveDeposits: 0,
    };
  }
});
