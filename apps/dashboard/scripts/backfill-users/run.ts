/**
 * Backfill orchestrator. Idempotent and rerunnable: `getOrCreateByEmail`,
 * `dynamicUserId` write-once, and `claimLegacyRecords` all converge on
 * re-run. `--dry-run` computes the plan without writing. Team membership is
 * explicit-only; the backfill never joins a team.
 */

import { DynamicUserIdConflictError } from "@/lib/services/types";

import type {
  BackfillUserResult,
  BackfillUsersDeps,
  BackfillUsersReport,
} from "./types";

function emptyTotals(): BackfillUsersReport["totals"] {
  return {
    usersUpserted: 0,
    prospectsClaimed: 0,
    demoConfigsClaimed: 0,
    skipped: 0,
  };
}

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

export async function runBackfillUsers(
  deps: BackfillUsersDeps,
): Promise<BackfillUsersReport> {
  const log = deps.log ?? (() => {});
  const dryRun = deps.dryRun ?? false;
  const allowed = new Set(deps.allowedDomains.map((d) => d.trim().toLowerCase()));
  const results: BackfillUserResult[] = [];
  const totals = emptyTotals();

  const directory = await deps.client.listEnvironmentUsers();
  for (const entry of directory) {
    const email = entry.email.trim().toLowerCase();
    if (!email || !allowed.has(domainOf(email))) {
      totals.skipped++;
      results.push({ email: entry.email, outcome: "skipped-domain" });
      continue;
    }

    if (dryRun) {
      results.push({ email, outcome: "would-link" });
      log(`would link ${email} (${entry.userId})`);
      continue;
    }

    const user = await deps.users.getOrCreateByEmail(email);
    totals.usersUpserted++;

    let linked = false;
    if (!user.dynamicUserId) {
      try {
        await deps.users.update(user.id, { dynamicUserId: entry.userId });
        linked = true;
      } catch (err) {
        if (err instanceof DynamicUserIdConflictError) {
          // Write-once: keep the stored value; surface the mismatch.
          results.push({
            email,
            outcome: "skipped-conflict",
            reason: err.message,
          });
          log(`conflict for ${email}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }

    const claimed = await deps.users.claimLegacyRecords({
      id: user.id,
      dynamicUserId: entry.userId,
    });
    totals.prospectsClaimed += claimed.prospects;
    totals.demoConfigsClaimed += claimed.demoConfigs;

    results.push({
      email,
      outcome: linked ? "linked" : "already-linked",
    });
    log(
      `${linked ? "linked" : "already-linked"} ${email} - claimed ${claimed.prospects} prospect(s), ${claimed.demoConfigs} demo-config(s)`,
    );
  }

  return { results, totals };
}
