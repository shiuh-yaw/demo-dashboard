"use client";

/**
 * The user's embedded EVM wallet account. `useGetWalletAccounts` types its
 * return as `BaseWalletAccount<Chain>` rather than the module-augmented
 * `WalletAccount` alias, so cast to bridge it (same fix used across the app).
 */

import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import type { WalletAccount } from "@dynamic-labs-sdk/client";

export function useEvmWalletAccount(): WalletAccount | undefined {
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  return (walletAccounts as WalletAccount[]).find(isEvmWalletAccount);
}
