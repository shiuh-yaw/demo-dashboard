/**
 * Visa Direct Dashboard Page
 *
 * Fetches Visa Direct configurations from Redis on the server and passes
 * them to the client component. Supports creating configs with theme and
 * branding for the Visa Direct demo app.
 */

import { getAllVisaDirectConfigs } from "@/lib/actions/visa-direct";
import { getCurrentUser } from "@/lib/auth/session";
import { VisaDirectClient } from "./components/visa-direct-client";

export default async function VisaDirectPage() {
  const { configs, orphaned } = await getAllVisaDirectConfigs();
  const user = await getCurrentUser();

  return (
    <VisaDirectClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
