/**
 * Server-side auth and user data for page render.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import {
  getAuthenticatedUserFromCookies,
  getUserIdFromPayload,
  getUser,
  getWalletType,
  isKycCompleted,
} from "@dynamic-demos/dynamic";

export interface ServerUserData {
  isLoggedIn: boolean;
  kycApproved: boolean;
  walletType: "external" | "embedded" | "fireblocks" | null;
  userId: string;
  email: string | null;
  walletAddress: string | null;
}

function getPrimaryWalletAddress(user: {
  wallets?: Array<{ publicKey: string }>;
}): string | null {
  return user.wallets?.[0]?.publicKey ?? null;
}

/**
 * Get full user data from server (auth, KYC, wallet address).
 * Cached per-request so layout + page share the same fetch.
 */
export const getServerUserData = cache(
  async function getServerUserData(): Promise<ServerUserData | null> {
    const cookieStore = await cookies();
    const authUser = await getAuthenticatedUserFromCookies(cookieStore);

    if (!authUser) {
      return null;
    }

    const userId = getUserIdFromPayload(authUser) ?? "";
    if (!userId) {
      return null;
    }

    try {
      const user = await getUser(userId);
      const kycApproved = user ? isKycCompleted(user) : false;
      const walletType = user ? getWalletType(user) : null;
      const walletAddress = user ? getPrimaryWalletAddress(user) : null;

      return {
        isLoggedIn: true,
        kycApproved,
        walletType,
        userId,
        email: authUser.email ?? null,
        walletAddress,
      };
    } catch {
      return {
        isLoggedIn: true,
        kycApproved: false,
        walletType: null,
        userId,
        email: authUser.email ?? null,
        walletAddress: null,
      };
    }
  },
);
