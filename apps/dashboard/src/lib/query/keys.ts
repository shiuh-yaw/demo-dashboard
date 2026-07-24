import type { ProspectScope } from "@/lib/prospect-scope";

/**
 * Query Key Factory
 *
 * Centralizes TanStack Query cache keys so invalidation stays consistent -
 * every list key is namespaced under `[entity, "list", filters]`, letting
 * callers invalidate a whole entity (`keys.prospects.all`) or just its
 * lists (`keys.prospects.lists()`) without hand-rolling tuples at each
 * call site.
 */

/** Readonly tuple key set for one entity's list queries. */
interface EntityListKeys<Filters> {
  all: readonly [string];
  lists: () => readonly [string, "list"];
  list: (filters?: Filters) => readonly [string, "list", Filters | undefined];
}

function createEntityListKeys<Filters = Record<string, unknown>>(
  entity: string,
): EntityListKeys<Filters> {
  const all = [entity] as const;
  return {
    all,
    lists: () => [...all, "list"] as const,
    list: (filters?: Filters) => [...all, "list", filters] as const,
  };
}

/** Prospects-list query filters: the active My/Team/All scope drives the cache bucket, so a scope change (via the team switcher or the My/Team/All filter) never mixes pages fetched under a different scope. */
export interface ProspectListFilters {
  scope: ProspectScope;
}

export const keys = {
  prospects: createEntityListKeys<ProspectListFilters>("prospects"),
  demoConfigs: createEntityListKeys("demoConfigs"),
  contacts: createEntityListKeys("contacts"),
  sessions: createEntityListKeys("sessions"),
  adminTeams: createEntityListKeys("adminTeams"),
  adminUsers: createEntityListKeys("adminUsers"),
  /** Top-bar "Getting started" popover state - single value, not a list. */
  onboardingChecklist: ["onboardingChecklist"] as const,
  /** Prospect-picker combobox options (visibility-scoped) - single value, not a list. */
  prospectOptions: ["prospectOptions"] as const,
};
