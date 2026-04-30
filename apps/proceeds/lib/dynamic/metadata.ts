"use client";

import { updateUser } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export interface WalletMeta {
  deleted?: boolean;
  cryptoCard?: {
    lastFour: string;
    createdAt: string;
  };
}

export interface ProceedsMetadata {
  wallets: Record<string, WalletMeta>;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function getProceedsMetadata(): ProceedsMetadata {
  const client = getClient();
  const raw = (client?.user?.metadata as Record<string, unknown> | undefined)
    ?.proceeds as ProceedsMetadata | undefined;
  return raw && typeof raw === "object" && raw.wallets
    ? raw
    : { wallets: {} };
}

export function getWalletMeta(address: string): WalletMeta | undefined {
  const meta = getProceedsMetadata();
  return meta.wallets[normalizeAddress(address)];
}

export async function updateWalletMeta(
  address: string,
  patch: Partial<WalletMeta>,
): Promise<void> {
  const existing = getProceedsMetadata();
  const key = normalizeAddress(address);
  const current = existing.wallets[key] ?? {};
  const merged = { ...current, ...patch };
  const cleaned = Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v !== null && v !== undefined),
  ) as WalletMeta;

  const updated: ProceedsMetadata = {
    ...existing,
    wallets: {
      ...existing.wallets,
      [key]: cleaned,
    },
  };

  await updateUser({
    userFields: {
      metadata: {
        ...((getClient()?.user?.metadata as Record<string, unknown>) ?? {}),
        proceeds: updated,
      },
    },
  });
}
