/**
 * Checkouts Dashboard Page (Server Component)
 *
 * Fetches checkout configurations from Redis on the server and passes them
 * to the client component.
 */

import { getAllCheckoutConfigs } from "@/lib/actions/checkouts";
import { getCurrentUser } from "@/lib/auth/session";
import { CheckoutsClient } from "./components/checkouts-client";

export default async function CheckoutsPage() {
  // Fetch configs from Redis (user's checkouts and orphaned checkouts)
  const { checkouts, orphaned } = await getAllCheckoutConfigs();
  const user = await getCurrentUser();

  return (
    <CheckoutsClient
      initialCheckouts={checkouts}
      orphanedCheckouts={orphaned}
      currentUserId={user?.sub}
      currentUserEmail={user?.email}
    />
  );
}
