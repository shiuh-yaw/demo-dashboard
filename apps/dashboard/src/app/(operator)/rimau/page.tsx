/**
 * Rimau Dashboard Page
 *
 * Fetches Rimau configurations from Redis on the server and passes them
 * to the client component. Supports creating configs with theme
 * and branding for the Rimau demo app.
 */

import { getAllRimauConfigs } from "@/lib/actions/rimau";
import { getCurrentUser } from "@/lib/auth/session";
import { RimauClient } from "./components/rimau-client";

export default async function RimauPage() {
  const { configs, orphaned } = await getAllRimauConfigs();
  const user = await getCurrentUser();

  return (
    <RimauClient
      initialConfigs={configs}
      orphanedConfigs={orphaned}
      currentUserId={user?.sub}
    />
  );
}
