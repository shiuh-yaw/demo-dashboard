/**
 * Server-only helper that reads the user's persisted payout
 * preferences from Dynamic metadata.
 *
 * Mirrors `GET /api/preferences` so server-rendered pages can hydrate
 * with the same values the client would otherwise fetch, avoiding a
 * round-trip + loading flash.
 */

import { getUser } from "@dynamic-demos/dynamic";
import { getServerUserData } from "@/lib/auth/server-auth";
import { env } from "@/lib/env";

const METADATA_KEYS = {
  defaultMethod: "vd_default_payout_method",
  walletAddress: "vd_wallet_address",
  walletProvider: "vd_wallet_provider",
} as const;

export interface ServerPreferences {
  defaultMethod: "bank" | "wallet" | "card" | null;
  walletAddress: string | null;
  walletProvider: string | null;
}

function emptyPrefs(): ServerPreferences {
  return {
    defaultMethod: null,
    walletAddress: null,
    walletProvider: null,
  };
}

function coerceString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns the signed-in user's persisted preferences, or all-nulls
 * when there's no authenticated session / Dynamic isn't configured.
 * Never redirects — callers decide how to handle an unauthenticated
 * visitor.
 */
export async function getServerPreferences(): Promise<ServerPreferences> {
  if (!env.DYNAMIC_API_KEY) return emptyPrefs();

  try {
    const user = await getServerUserData({ redirectToLogin: false });
    if (!user) return emptyPrefs();

    const dynUser = await getUser(user.userId);
    const meta = dynUser?.metadata ?? {};

    const defaultMethodRaw = coerceString(meta[METADATA_KEYS.defaultMethod]);
    const defaultMethod =
      defaultMethodRaw && ["bank", "wallet", "card"].includes(defaultMethodRaw)
        ? (defaultMethodRaw as ServerPreferences["defaultMethod"])
        : null;

    return {
      defaultMethod,
      walletAddress: coerceString(meta[METADATA_KEYS.walletAddress]),
      walletProvider: coerceString(meta[METADATA_KEYS.walletProvider]),
    };
  } catch {
    return emptyPrefs();
  }
}
