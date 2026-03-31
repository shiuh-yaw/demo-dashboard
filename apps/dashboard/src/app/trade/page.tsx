/**
 * Trade Dashboard Page
 *
 * Fetches Trade configurations from Redis on the server and passes them
 * to the client component. Supports creating configs with theme
 * and branding for the Trade demo app.
 */

import { getAllTradeConfigs } from "@/lib/actions/trade";
import { getCurrentUser } from "@/lib/auth/session";
import { TradeClient } from "./components/trade-client";

export default async function TradePage() {
  const { configs, orphaned } = await getAllTradeConfigs();
  const user = await getCurrentUser();

  return (
    <TradeClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
