/**
 * Phase 2-brands Part B — backfill CLI entry point.
 *
 * Wires real Redis and the ProspectService selected by USE_POSTGRES_PROSPECTS,
 * then prints a human-readable report. The orchestrator is in run.ts;
 * this file holds zero business logic so the test suite covers all of
 * the script's risk surface.
 *
 * Usage:
 *   USE_POSTGRES_PROSPECTS=true pnpm --filter @dynamic-demos/dashboard backfill:prospects
 *
 * Exit codes:
 *   0 — run finished. Some records may have been skipped or failed; the
 *       printed report makes that visible. Idempotent so a re-run with
 *       fixed inputs converges.
 *   1 — fatal error reaching Redis or the prospect service.
 *
 * Hard rule: never log connection strings or anything that contains a
 * secret. Logging is restricted to record ids, kinds, and counts.
 */

import { prospectService } from "@/lib/services";
import { getRedis } from "@/lib/redis";

import { runBackfill } from "./run";

async function main() {
  const redis = getRedis();
  const report = await runBackfill({
    redis,
    prospects: prospectService,
    log: (m) => process.stdout.write(`${m}\n`),
  });
  process.stdout.write("\n=== Prospect backfill complete ===\n");
  process.stdout.write(`created: ${report.totals.created}\n`);
  process.stdout.write(`deduped: ${report.totals.deduped}\n`);
  process.stdout.write(`skipped: ${report.totals.skipped}\n`);
  process.stdout.write(`failed:  ${report.totals.failed}\n`);
  if (report.totals.failed > 0) {
    process.stdout.write(
      "\nNote: failures are recoverable. Re-running the script will retry.\n",
    );
  }
}

main().catch((err) => {
  // Use stderr so failed runs are visible in CI logs without leaking
  // them into the stdout report contract.
  process.stderr.write(
    `[backfill-prospects] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
