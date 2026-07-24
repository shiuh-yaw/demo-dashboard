"use server";

/**
 * Server actions + loader for the prospect scope controls (top-bar team
 * switcher and the My/Team/All filter). Cookies are the persistence; the data
 * layer re-derives the authoritative scope from them via `resolveProspectScope`
 * so the UI switcher is convenience only.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionUser, membershipsForUserCached } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import {
  TEAM_CTX_COOKIE,
  PROSPECT_FILTER_COOKIE,
  defaultFilter,
  normalizeFilter,
  type ProspectFilter,
} from "@/lib/prospect-scope";

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export interface ScopeContext {
  isAdmin: boolean;
  /** Teams the user may switch into (member teams; admins still list these). */
  teams: { id: string; name: string }[];
  /** Raw active team context: "personal" | "all" | a teamId. */
  activeCtx: string;
  /** Effective (normalized) filter after admin gating + defaults. */
  filter: ProspectFilter;
  /** True when the active context is a real, permitted team. */
  onTeam: boolean;
}

/** Request-memoized team list; never cache across requests. */
const teamsListCached = cache(() => services.teams.list());

/** Load the scope controls' state for the current user (server-side). */
export async function getScopeContext(): Promise<ScopeContext> {
  const user = await getSessionUser();
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  if (!user) {
    return { isAdmin: false, teams: [], activeCtx: "personal", filter: "mine", onTeam: false };
  }

  const [memberships, teamsPage] = await Promise.all([
    membershipsForUserCached(user.id),
    teamsListCached(),
  ]);
  const memberTeamIds = new Set(memberships.map((m) => m.teamId));
  const teams = teamsPage.items
    .filter((t) => memberTeamIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name }));

  const store = await cookies();
  const rawCtx = store.get(TEAM_CTX_COOKIE)?.value;
  const rawFilter = store.get(PROSPECT_FILTER_COOKIE)?.value;

  const onTeam =
    !!rawCtx &&
    rawCtx !== "personal" &&
    rawCtx !== "all" &&
    (isAdmin || memberTeamIds.has(rawCtx));
  const activeCtx = rawCtx && (rawCtx === "all" ? isAdmin : onTeam || rawCtx === "personal")
    ? rawCtx
    : "personal";

  const filter = normalizeFilter(
    rawFilter,
    isAdmin,
    defaultFilter({ ctx: activeCtx, isAdmin, memberTeamIds }),
  );

  return { isAdmin, teams, activeCtx, filter, onTeam };
}

/** Persist the active team context (switcher). */
export async function setTeamContext(value: string): Promise<void> {
  const store = await cookies();
  store.set(TEAM_CTX_COOKIE, value, COOKIE_OPTS);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/prospects");
}

/** Persist the My/Team/All filter. */
export async function setProspectFilter(value: ProspectFilter): Promise<void> {
  const store = await cookies();
  store.set(PROSPECT_FILTER_COOKIE, value, COOKIE_OPTS);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/prospects");
}
