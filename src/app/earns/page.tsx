/**
 * Earns Dashboard Page (Server Component)
 *
 * Fetches Earn configurations from Redis on the server and passes them
 * to the client component.
 */

import { getAllEarnConfigs } from "@/lib/actions/earns";
import { getCurrentUser } from "@/lib/auth/session";
import { EarnsClient } from "./components/earns-client";

export default async function EarnsPage() {
  // Fetch configs from Redis (user's configs and orphaned configs)
  const { configs, orphaned } = await getAllEarnConfigs();
  const user = await getCurrentUser();

  return (
    <EarnsClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
