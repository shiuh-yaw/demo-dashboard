/**
 * Brands Dashboard Page (Server Component)
 *
 * Fetches Brand Profiles from Redis on the server and passes them
 * to the client component.
 */

import { getAllBrandProfiles } from "@/lib/actions/brands";
import { getCurrentUser } from "@/lib/auth/session";
import { BrandsClient } from "./components/brands-client";

export default async function BrandsPage() {
  // Fetch profiles from Redis (user's profiles and orphaned profiles)
  const { profiles, orphaned } = await getAllBrandProfiles();
  const user = await getCurrentUser();

  return (
    <BrandsClient
      initialProfiles={profiles}
      orphanedProfiles={orphaned}
      currentUserId={user?.sub}
    />
  );
}
