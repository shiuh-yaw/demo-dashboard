"use client";

import { useEffect, useState } from "react";
import {
  getPrimarySmartEvmAccount,
  onEvent,
  type EvmWalletAccount,
} from "@/lib/dynamic";

function findPrimaryEvmAccount(): EvmWalletAccount | null {
  // `getPrimarySmartEvmAccount` prefers the ZeroDev kernel account
  // over the WaaS EOA so send flows hit a valid smart-wallet account.
  return getPrimarySmartEvmAccount();
}

/**
 * Subscribes to Dynamic's wallet account + user events and returns the
 * primary EVM `WalletAccount` — the one the send/receive/yield flows
 * need as a signer. Returns null until the SDK has initialized and the
 * user has at least one EVM wallet.
 *
 * Kept separate from `useActiveNetwork` because callers here need the
 * account object itself (for viem wallet clients), not just chain meta.
 */
export function usePrimaryEvmAccount(): EvmWalletAccount | null {
  const [account, setAccount] = useState<EvmWalletAccount | null>(() =>
    typeof window === "undefined" ? null : findPrimaryEvmAccount(),
  );

  useEffect(() => {
    setAccount(findPrimaryEvmAccount());

    const refresh = () => setAccount(findPrimaryEvmAccount());

    const unsubWallet = onEvent({
      event: "walletAccountsChanged",
      listener: refresh,
    });
    const unsubUser = onEvent({ event: "userChanged", listener: refresh });
    const unsubLogout = onEvent({
      event: "logout",
      listener: () => setAccount(null),
    });

    return () => {
      unsubWallet?.();
      unsubUser?.();
      unsubLogout?.();
    };
  }, []);

  return account;
}
