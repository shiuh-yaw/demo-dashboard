"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAuthToken,
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "@/lib/dynamic";
import type { WalletOption } from "@dynamic-demos/ui";

async function setWalletTypeApi(type: WalletOption): Promise<void> {
  const token = await getAuthToken().catch(() => null);
  const headers: HeadersInit =
    token && typeof token === "string" ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch("/api/wallet/select", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Failed to save selection (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
}

async function createFireblocksVaultApi(): Promise<void> {
  const token = await getAuthToken().catch(() => null);
  const headers: HeadersInit =
    token && typeof token === "string" ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch("/api/wallet/fireblocks/create", {
    method: "POST",
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Failed to create vault (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
}

/**
 * Full wallet selection flow: creates wallets/vault as needed, then saves type.
 * - embedded: creates missing WaaS wallets via Dynamic SDK, then saves type
 * - fireblocks: creates Fireblocks vault via API (also saves type)
 * - external: saves type only
 */
async function selectWalletType(option: WalletOption): Promise<void> {
  if (option === "embedded") {
    const missingChains = getChainsMissingWaasWalletAccounts();
    if (missingChains.length > 0) {
      await createWaasWalletAccounts({ chains: missingChains });
    }
  }

  if (option === "fireblocks") {
    await createFireblocksVaultApi();
    return;
  }

  await setWalletTypeApi(option);
}

export function useSetWalletType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: selectWalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-metadata"] });
    },
  });
}
