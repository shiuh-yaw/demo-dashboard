/**
 * Wallets Dashboard Page (Server Component)
 *
 * Fetches Wallet configurations from Redis on the server and passes them
 * to the client component.
 */

import { getAllWalletConfigs } from "@/lib/actions/wallets";
import { getCurrentUser } from "@/lib/auth/session";
import { WalletsClient } from "./components/wallets-client";

export default async function WalletsPage() {
  // Fetch configs from Redis (user's configs and orphaned configs)
  const { configs, orphaned } = await getAllWalletConfigs();
  const user = await getCurrentUser();

  return (
    <WalletsClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
