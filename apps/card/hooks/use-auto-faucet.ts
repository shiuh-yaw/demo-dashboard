"use client";

/**
 * First time a user reaches their card, mint starter test-USDC so the demo
 * is immediately fundable - no manual "Get USDC" needed on the very first
 * run. Gated per-user by a localStorage flag so it fires once (best-effort
 * "first time ever" - per device; a demo doesn't need cross-device state).
 * Reuses `useFaucet` so the mint rides the same success notice + balance
 * watch as the manual button.
 */

import { useEffect, useRef } from "react";
import { useGetWalletAccounts, useUser } from "@dynamic-labs-sdk/react-hooks";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import type { WalletAccount } from "@dynamic-labs-sdk/client";

import { useFaucet } from "@/hooks/use-faucet";

const KEY_PREFIX = "dd_card_starter_funded:";

export function useAutoFaucet(): void {
  const { data: user } = useUser();
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  const walletAccount = (walletAccounts as WalletAccount[]).find(
    isEvmWalletAccount,
  );
  const { mint } = useFaucet();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const userId = user?.id;
    if (!userId || !walletAccount) return;

    try {
      const key = KEY_PREFIX + userId;
      if (localStorage.getItem(key) === "1") return;
      // Mark before minting so a re-render can't double-fire; a failed
      // starter mint just means the user taps "Get USDC" themselves.
      localStorage.setItem(key, "1");
    } catch {
      return; // storage unavailable - skip the auto-mint entirely
    }

    firedRef.current = true;
    void mint();
  }, [user, walletAccount, mint]);
}
