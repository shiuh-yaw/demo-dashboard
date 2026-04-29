"use client";

// Selection over a Dynamic `accounts` list that stays live when upstream
// account objects mutate. Storing a WalletAccount directly as useState freezes
// a snapshot, so an injected-provider account-switch (e.g. MetaMask changing
// its active address while keeping the same id) would leave the UI pinned to
// the old address. This hook stores only a stable id and derives the current
// WalletAccount from the accounts array on every render.
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { useEffect, useState } from "react";

export type ResolveResult = {
  selectedAccount: WalletAccount | null;
  nextId: string | null;
};

export function resolveSelectedAccount(
  accounts: WalletAccount[],
  selectedId: string | null,
): ResolveResult {
  const [first] = accounts;
  if (!first) {
    return { selectedAccount: null, nextId: null };
  }
  const matched = selectedId
    ? (accounts.find((a) => a.id === selectedId) ?? null)
    : null;
  if (matched) {
    return { selectedAccount: matched, nextId: selectedId };
  }
  return { selectedAccount: first, nextId: first.id };
}

export function useSelectedAccount(accounts: WalletAccount[]): {
  selectedAccount: WalletAccount | null;
  selectAccountId: (id: string | null) => void;
} {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { selectedAccount, nextId } = resolveSelectedAccount(
    accounts,
    selectedId,
  );

  // Sync persisted id when auto-pick or drain adjusts it. The derived
  // selectedAccount is already correct this render; this effect catches up
  // the stored id on the next tick.
  useEffect(() => {
    if (nextId !== selectedId) setSelectedId(nextId);
  }, [nextId, selectedId]);

  return { selectedAccount, selectAccountId: setSelectedId };
}
