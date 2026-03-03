/**
 * Admin user listing with USDC balances.
 * Shared between admin page (SSR) and API handler.
 */

import { listUsers, FIREBLOCKS_VAULT_METADATA_KEY } from "@/lib/dynamic-api";
import { getMetadataString } from "@/lib/user-metadata";
import { getServerUsdcBalance } from "@/lib/balance/server";
import type { DynamicUser } from "@/lib/dynamic-api";

export type UserWithBalance = DynamicUser & { usdcBalance: number };

/**
 * List users with USDC balances (embedded wallet + vault) for admin display.
 */
export async function listUsersWithBalances(
  query?: string,
): Promise<UserWithBalance[]> {
  const users = await listUsers(query);

  const usersWithBalances = await Promise.all(
    users.map(async (user) => {
      const addresses: string[] = [];
      const evmWallet = user.wallets?.find((w) => w.chain === "EVM");
      if (evmWallet?.publicKey) addresses.push(evmWallet.publicKey);
      const vaultAddress = getMetadataString(
        user,
        FIREBLOCKS_VAULT_METADATA_KEY,
      );
      if (vaultAddress && !addresses.includes(vaultAddress))
        addresses.push(vaultAddress);

      const balances = await Promise.all(
        addresses.map((addr) => getServerUsdcBalance(addr)),
      );
      const usdcBalance = balances.reduce((sum, b) => sum + b, 0);

      return { ...user, usdcBalance };
    }),
  );

  return usersWithBalances;
}
