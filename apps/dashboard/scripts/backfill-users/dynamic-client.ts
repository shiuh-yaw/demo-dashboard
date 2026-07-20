/**
 * Dynamic admin API directory client. Lists environment users via the
 * documented admin REST base, paging until exhausted. Bearer token comes
 * from `DYNAMIC_API_TOKEN`; the environment id from
 * `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`. Read-only; never logs the token.
 */

import type { DynamicDirectoryClient, DynamicDirectoryUser } from "./types";

const DYNAMIC_API_BASE = "https://app.dynamicauth.com/api/v0";

interface DynamicApiUser {
  id?: string;
  userId?: string;
  email?: string | null;
  verifiedCredentials?: Array<{ email?: string | null }>;
}

/** Best-effort extraction of a primary email across API shape variants. */
function primaryEmail(u: DynamicApiUser): string {
  if (u.email) return u.email;
  for (const c of u.verifiedCredentials ?? []) {
    if (c.email) return c.email;
  }
  return "";
}

export function createDynamicDirectoryClient(opts: {
  token: string;
  environmentId: string;
  fetchImpl?: typeof fetch;
}): DynamicDirectoryClient {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    async listEnvironmentUsers(): Promise<DynamicDirectoryUser[]> {
      const out: DynamicDirectoryUser[] = [];
      const limit = 100;
      let offset = 0;
      // Page until a short page signals the end.
      for (;;) {
        const url = `${DYNAMIC_API_BASE}/environments/${opts.environmentId}/users?limit=${limit}&offset=${offset}`;
        const res = await doFetch(url, {
          headers: {
            Authorization: `Bearer ${opts.token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(
            `Dynamic admin API ${res.status} listing users (offset ${offset})`,
          );
        }
        const body = (await res.json()) as { users?: DynamicApiUser[] };
        const page = body.users ?? [];
        for (const u of page) {
          const userId = u.id ?? u.userId ?? "";
          // An empty id must never reach the unique dynamicUserId column.
          if (!userId) continue;
          out.push({ userId, email: primaryEmail(u) });
        }
        if (page.length < limit) break;
        offset += limit;
      }
      return out;
    },
  };
}
