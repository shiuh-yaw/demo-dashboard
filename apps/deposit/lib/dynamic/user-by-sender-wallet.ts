/**
 * Dynamic admin API: load users by id (vault owner) and read wallet addresses
 * from `wallets` and `verifiedCredentials`.
 *
 * @see https://www.dynamic.xyz/docs/api-reference/users/get-a-user-by-id
 */

import { env } from "@/lib/env";

const DYNAMIC_API_BASE = "https://app.dynamicauth.com/api/v0";

function adminHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${env.DYNAMIC_API_KEY.trim()}`,
    "Content-Type": "application/json",
  };
}

export interface DynamicVerifiedCredential {
  address?: string;
  public_identifier?: string;
  chain?: string;
  wallet_provider?: string;
  format?: string;
}

export interface DynamicWalletRow {
  id: string;
  publicKey: string;
  chain: string;
  name: string;
  /** e.g. browserExtension, embeddedWallet */
  provider?: string;
}

export interface DynamicUser {
  id: string;
  wallets?: DynamicWalletRow[];
  verifiedCredentials?: DynamicVerifiedCredential[];
  metadata?: Record<string, unknown>;
}

function normalizeWalletPublicKeyForLookup(address: string): string {
  const t = address.trim();
  if (/^0x[0-9a-fA-F]+$/.test(t)) return t.toLowerCase();
  return t;
}

function credentialAddress(c: DynamicVerifiedCredential): string {
  const raw = c.address ?? c.public_identifier;
  return typeof raw === "string" ? raw.trim() : "";
}

function isEmbeddedWalletRow(w: DynamicWalletRow): boolean {
  const p = (w.provider ?? "").trim().toLowerCase();
  if (p.includes("embedded")) return true;
  const n = (w.name ?? "").trim().toLowerCase();
  return n.includes("dynamicwaas") || n.includes("embedded");
}

/**
 * True if `sourceAddress` is a blockchain wallet on this user (wallets or verifiedCredentials).
 */
export function dynamicUserOwnsSenderAddress(
  user: DynamicUser,
  sourceAddress: string,
): boolean {
  const want = normalizeWalletPublicKeyForLookup(sourceAddress);
  if (!want) return false;

  for (const w of user.wallets ?? []) {
    const pk = (w.publicKey ?? "").trim();
    if (pk && normalizeWalletPublicKeyForLookup(pk) === want) return true;
  }

  for (const c of user.verifiedCredentials ?? []) {
    if ((c.format ?? "").toLowerCase() !== "blockchain") continue;
    const addr = credentialAddress(c);
    if (addr && normalizeWalletPublicKeyForLookup(addr) === want) return true;
  }

  return false;
}

/**
 * Embedded EVM address for this user (`wallets` / `verifiedCredentials`).
 */
export function embeddedEvmAddressFromDynamicUser(
  user: DynamicUser,
): string | null {
  const fromWallets = (user.wallets ?? []).filter(isEmbeddedWalletRow);
  const evmWallet =
    fromWallets.find((w) => {
      const c = (w.chain ?? "").toUpperCase();
      return !c || c === "EVM" || c.includes("EVM");
    }) ?? fromWallets[0];
  const fromWalletPk = evmWallet?.publicKey?.trim();
  if (fromWalletPk) return fromWalletPk;

  const vcs = user.verifiedCredentials ?? [];
  const embeddedVc = vcs.filter((c) =>
    (c.wallet_provider ?? "").toLowerCase().includes("embedded"),
  );
  const withAddr = embeddedVc.filter((c) => credentialAddress(c) !== "");
  const evmVc =
    withAddr.find((c) => {
      const ch = (c.chain ?? "").toLowerCase();
      return !ch || ch.includes("eip155") || ch === "evm";
    }) ?? withAddr[0];
  const fromVc = evmVc ? credentialAddress(evmVc) : "";
  return fromVc || null;
}

/**
 * Full user for the given Dynamic user id (from vault name: Deposit Vault - {id}).
 */
export async function getDynamicUserById(
  userId: string,
): Promise<DynamicUser | null> {
  const trimmed = userId.trim();
  if (!trimmed) return null;

  const envId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.trim();
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${trimmed}`,
    { headers: adminHeaders() },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic get user error: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { user?: DynamicUser };
  return data.user ?? null;
}
