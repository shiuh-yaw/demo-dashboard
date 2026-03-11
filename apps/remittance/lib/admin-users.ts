/**
 * Admin user listing with USDC balances.
 * Shared between admin page (SSR) and API handler.
 */

import {
  listUsers,
  FIREBLOCKS_VAULT_METADATA_KEY,
  FIREBLOCKS_VAULT_ID_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getMetadataString } from "@/lib/user-metadata";
import { getServerUsdcBalance } from "@/lib/balance/server";
import { getFireblocksClient } from "@/lib/fireblocks";
import { resolveVaultIdByName } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import type { DynamicUser } from "@/lib/dynamic-api";

export type UserWithBalance = DynamicUser & {
  usdcBalance: number;
  walletBalance: number;
  vaultBalance: number;
  vaultId: string | null;
};

/**
 * List users with USDC balances (embedded wallet + vault) for admin display.
 */
export async function listUsersWithBalances(
  query?: string,
): Promise<UserWithBalance[]> {
  const users = await listUsers(query);

  const usersWithBalances = await Promise.all(
    users.map(async (user) => {
      const evmWallet = user.wallets?.find((w) => w.chain === "EVM");
      const walletAddress = evmWallet?.publicKey ?? null;
      const vaultAddress = getMetadataString(
        user,
        FIREBLOCKS_VAULT_METADATA_KEY,
      );

      // Fetch on-chain balances in parallel
      const [walletBalance, vaultOnChainBalance] = await Promise.all([
        getServerUsdcBalance(walletAddress),
        getServerUsdcBalance(vaultAddress),
      ]);

      // Resolve vault ID from metadata or by name lookup
      let vaultId = getMetadataString(user, FIREBLOCKS_VAULT_ID_METADATA_KEY);
      let vaultBalance = 0;

      if (vaultAddress && !vaultId) {
        try {
          const client = getFireblocksClient();
          vaultId = await resolveVaultIdByName(
            client,
            OFFRAMP_VAULT_PREFIX + user.id,
          );
        } catch {
          // Vault lookup failed, skip
        }
      }

      if (vaultId) {
        try {
          const client = getFireblocksClient();
          const assetId = process.env.FIREBLOCKS_DEFAULT_ASSET_ID;
          if (assetId) {
            const asset = await client.getVaultAssetBalance(vaultId, assetId);
            vaultBalance = parseFloat(asset.available || "0");
          }
        } catch {
          // Fallback to on-chain balance for vault
          vaultBalance = vaultOnChainBalance;
        }
      } else {
        vaultBalance = vaultOnChainBalance;
      }

      const usdcBalance = walletBalance + vaultBalance;

      return { ...user, usdcBalance, walletBalance, vaultBalance, vaultId };
    }),
  );

  usersWithBalances.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  return usersWithBalances;
}
