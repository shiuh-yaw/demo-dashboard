/**
 * Exchange Dashboard Page
 *
 * Fetches Exchange configurations from Redis on the server and passes them
 * to the client component. Supports creating configs with theme
 * and branding for the Exchange demo app.
 */

import { getAllExchangeConfigs } from "@/lib/actions/exchange";
import { getCurrentUser } from "@/lib/auth/session";
import { ExchangeClient } from "./components/exchange-client";

export default async function ExchangePage() {
  const { configs, orphaned } = await getAllExchangeConfigs();
  const user = await getCurrentUser();

  return (
    <ExchangeClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
