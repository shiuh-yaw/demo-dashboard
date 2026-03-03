/**
 * Remittance Dashboard Page
 *
 * Fetches Remittance configurations from Redis on the server and passes them
 * to the client component. Supports creating wallet-like configs with theme
 * and branding for the Remittance demo app.
 */

import { getAllRemittanceConfigs } from "@/lib/actions/remittance";
import { getCurrentUser } from "@/lib/auth/session";
import { RemittanceClient } from "./components/remittance-client";

export default async function RemittancePage() {
  const { configs, orphaned } = await getAllRemittanceConfigs();
  const user = await getCurrentUser();

  return (
    <RemittanceClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
