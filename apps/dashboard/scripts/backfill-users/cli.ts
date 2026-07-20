/**
 * Phase GTM-03.5A - backfill-users CLI entry point.
 *
 * Wires the real Dynamic admin client + Postgres user/team services, then
 * prints a human-readable report. Business logic lives in run.ts.
 *
 * Usage:
 *   pnpm --filter @dynamic-demos/dashboard backfill:users [--dry-run]
 *
 * Requires DYNAMIC_API_TOKEN, NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID, and
 * GTM_ALLOWED_DOMAINS in the environment. Never logs the token.
 *
 * Exit codes: 0 - run finished (report shows skips/conflicts); 1 - fatal.
 */

import { env } from "@/env";
import { gtmUserService, teamService } from "@/lib/services";

import { createDynamicDirectoryClient } from "./dynamic-client";
import { runBackfillUsers } from "./run";

async function main() {
  const token = env.DYNAMIC_API_TOKEN;
  if (!token) throw new Error("DYNAMIC_API_TOKEN is required");
  const allowedDomains = (process.env.GTM_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowedDomains.length === 0) {
    throw new Error("GTM_ALLOWED_DOMAINS is required (comma-separated)");
  }
  const dryRun = process.argv.includes("--dry-run");

  const client = createDynamicDirectoryClient({
    token,
    environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  });

  const report = await runBackfillUsers({
    client,
    users: gtmUserService,
    teams: teamService,
    allowedDomains,
    dryRun,
    log: (m) => process.stdout.write(`${m}\n`),
  });

  process.stdout.write(
    `\n=== User backfill complete${dryRun ? " (dry-run)" : ""} ===\n`,
  );
  process.stdout.write(`usersUpserted:      ${report.totals.usersUpserted}\n`);
  process.stdout.write(`membershipsEnsured: ${report.totals.membershipsEnsured}\n`);
  process.stdout.write(`prospectsClaimed:   ${report.totals.prospectsClaimed}\n`);
  process.stdout.write(`demoConfigsClaimed: ${report.totals.demoConfigsClaimed}\n`);
  process.stdout.write(`skipped:            ${report.totals.skipped}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `[backfill-users] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
