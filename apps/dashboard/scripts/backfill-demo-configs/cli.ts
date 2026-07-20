/**
 * Phase 2 unified-DemoConfig — backfill CLI entry point.
 *
 * Wires real Redis and the `ProspectService` + `DemoConfigService`
 * selected by their respective `USE_POSTGRES_*` flags, then prints a
 * human-readable report. The orchestrator is in `run.ts`; this file
 * holds zero business logic so the test suite covers the script's
 * full risk surface.
 *
 * Usage:
 *   USE_POSTGRES_PROSPECTS=true USE_POSTGRES_DEMO_CONFIGS=true \
 *     pnpm --filter @dynamic-demos/dashboard backfill:demo-configs
 *
 * Exit codes:
 *   0 — run finished. Some records may have been skipped or failed; the
 *       printed report makes that visible. Idempotent so a re-run with
 *       fixed inputs converges.
 *   1 — fatal error reaching Redis or one of the services.
 *
 * Hard rule: never log connection strings or anything that contains a
 * secret. Logging is restricted to record ids, kinds, and counts.
 */

import { env } from "@/env";
import { prospectService } from "@/lib/services";
import { PostgresDemoConfigService } from "@/lib/services/postgres/demo-configs";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import { getRedis } from "@/lib/redis";
import type { DemoConfigService } from "@/lib/services/types";

import { runDemoConfigsBackfill } from "./run";
import { BACKFILL_KINDS } from "./types";

async function main() {
  const redis = getRedis();
  // The backfill uses `demoConfigs.get(id)` as an existence probe to
  // distinguish `created` from `deduped`. The Redis service's TD-002
  // legacy-keyspace fallback would otherwise resolve every unmigrated id
  // to a synthesised record, producing a false `deduped` outcome. Disable
  // it here — the backfill is the canonical migration path, not a
  // read-through consumer.
  const demoConfigs: DemoConfigService = env.USE_POSTGRES_DEMO_CONFIGS
    ? new PostgresDemoConfigService()
    : new RedisDemoConfigService(redis, { enableLegacyFallback: false });
  const report = await runDemoConfigsBackfill({
    redis,
    prospects: prospectService,
    demoConfigs,
    log: (m) => process.stdout.write(`${m}\n`),
  });
  process.stdout.write("\n=== DemoConfig backfill complete ===\n");
  process.stdout.write(`created: ${report.totals.created}\n`);
  process.stdout.write(`deduped: ${report.totals.deduped}\n`);
  process.stdout.write(`skipped: ${report.totals.skipped}\n`);
  process.stdout.write(`failed:  ${report.totals.failed}\n`);
  process.stdout.write("\nper-kind breakdown:\n");
  for (const kind of BACKFILL_KINDS) {
    const k = report.byKind[kind];
    process.stdout.write(
      `  ${kind.padEnd(12)} created=${k.created} deduped=${k.deduped} skipped=${k.skipped} failed=${k.failed}\n`,
    );
  }
  if (report.totals.failed > 0) {
    process.stdout.write(
      "\nNote: failures are recoverable. Re-running the script will retry.\n",
    );
  }
}

main().catch((err) => {
  process.stderr.write(
    `[backfill-demo-configs] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
