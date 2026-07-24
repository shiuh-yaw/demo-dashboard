/**
 * Prospect hub - Settings. Basic Info + the prospect-global Brand Theme, with
 * the Save Changes action, plus Ownership (owner/team reassignment). Loads
 * only the profile + assignable-owner/team candidates the forms need (no
 * analytics); the header + sub-nav come from the shared hub layout.
 */

import { notFound } from "next/navigation";
import {
  getProspectProfile,
  listAssignableUsers,
  listAssignableTeams,
} from "@/lib/actions/prospects";
import { getSessionUser, canReassignProspect } from "@/lib/auth/gtm";
import { ProspectSettings } from "../prospect-settings";

interface ProspectSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectSettingsPage({
  params,
}: ProspectSettingsPageProps) {
  const { id } = await params;
  const [result, viewer, teamsResult] = await Promise.all([
    getProspectProfile(id),
    getSessionUser(),
    listAssignableTeams(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  // Depends on the resolved owner (result.data.resolvedOwnerId), so it can't
  // join the Promise.all above - it must always include the current owner,
  // even if deactivated, or the Owner select has no option to display it.
  const usersResult = await listAssignableUsers(result.data.resolvedOwnerId);

  const canReassignOwnership = Boolean(
    viewer &&
      canReassignProspect(viewer, {
        createdById: result.data.createdById ?? null,
        ownerId: result.data.ownerId,
      }),
  );

  return (
    <ProspectSettings
      profile={result.data}
      assignableUsers={usersResult.success ? usersResult.data : []}
      assignableTeams={teamsResult.success ? teamsResult.data : []}
      canReassignOwnership={canReassignOwnership}
    />
  );
}
