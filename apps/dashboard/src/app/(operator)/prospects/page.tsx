/**
 * Prospects Dashboard Page (Server Component)
 *
 * Fetches Prospect Profiles from Redis on the server and passes them
 * to the client component.
 */

import { getAllProspectProfiles } from "@/lib/actions/prospects";
import { getCurrentUser } from "@/lib/auth/session";
import { ProspectsClient } from "./components/prospects-client";

export default async function ProspectsPage() {
  // Fetch profiles from Redis (user's profiles and orphaned profiles)
  const { profiles, orphaned } = await getAllProspectProfiles();
  const user = await getCurrentUser();

  return (
    <ProspectsClient
      initialProfiles={profiles}
      orphanedProfiles={orphaned}
      currentUserId={user?.sub}
    />
  );
}
