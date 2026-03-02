"use client";

/**
 * Hook to get all wallet accounts.
 * Automatically updates when wallet accounts change.
 *
 * Returns undefined during SSR/initial hydration, then the actual array.
 */

import {
  getWalletAccounts,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { useClientState } from "./use-client-state";

export const useWalletAccounts = (): WalletAccount[] | undefined =>
  useClientState("walletAccountsChanged", () => getWalletAccounts());
