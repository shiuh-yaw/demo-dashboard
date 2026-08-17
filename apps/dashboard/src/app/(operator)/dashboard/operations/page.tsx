/**
 * Admin. Operator-only (requireAdmin, fail closed). Teams and roles - assigning
 * a user to a team expands that user's visible records; every mutation
 * re-checks the actor server-side. This is the Admin surface itself, not a hub
 * of links.
 */

import { requireAdmin } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import type { Page } from "@/lib/services";
import type { AdminUserView, TeamMemberView } from "@/lib/actions/team-views";
import {
  TeamsAdmin,
  type TeamWithMembers,
} from "./teams/components/teams-admin";
import {
  EnrichmentBackfill,
  ProspectBackfill,
} from "./components/enrichment-backfill";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await requireAdmin();

  const [teamsPage, usersPage] = await Promise.all([
    services.teams.list(),
    services.users.list(),
  ]);
  const teams = teamsPage.items;
  const users = usersPage.items;

  const usersById = new Map(users.map((u) => [u.id, u]));

  const teamsWithMembers: TeamWithMembers[] = await Promise.all(
    teams.map(async (team) => {
      const memberships = await services.teams.membershipsForTeam(team.id);
      const members: TeamMemberView[] = memberships.map((m) => {
        const u = usersById.get(m.userId);
        return {
          userId: m.userId,
          teamId: m.teamId,
          role: m.role,
          email: u?.email ?? m.userId,
          displayName: u?.displayName ?? null,
        };
      });
      return { id: team.id, name: team.name, slug: team.slug, members };
    }),
  );

  const userViews: AdminUserView[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
  }));

  // Page 1, SSR-seeded straight into the client's useInfiniteList caches -
  // `nextCursor` carries over from the underlying services so "Load more"
  // picks up exactly where this render left off, no refetch of page 1.
  const initialTeamsPage: Page<TeamWithMembers> = {
    items: teamsWithMembers,
    nextCursor: teamsPage.nextCursor,
  };
  const initialUsersPage: Page<AdminUserView> = {
    items: userViews,
    nextCursor: usersPage.nextCursor,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Teams and roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign users to teams to expand what they see. Manage workspace roles
          below.
        </p>
      </div>
      <TeamsAdmin
        initialTeamsPage={initialTeamsPage}
        initialUsersPage={initialUsersPage}
        actorRole={actor.role}
      />
      <EnrichmentBackfill />
      <ProspectBackfill />
    </div>
  );
}
