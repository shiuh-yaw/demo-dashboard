#!/usr/bin/env tsx
/**
 * One-off cleanup: remove orphan BrandProfile records from Redis.
 *
 * An "orphan" is a `demo-dashboard:brand:<id>` row whose `demos`
 * subdocument has no linked demo id for any kind (earn/checkouts/wallet
 * /remittance). These show up in the dashboard as brands with "0 demos".
 *
 * Dry-run by default — lists what *would* be deleted. Pass `--apply` to
 * actually remove. Reads Upstash creds from `apps/dashboard/.env.local`.
 *
 *   pnpm --filter @dynamic-demos/dashboard exec tsx --env-file=.env.local \
 *     scripts/clean-orphan-brand-profiles.ts
 *
 *   pnpm --filter @dynamic-demos/dashboard exec tsx --env-file=.env.local \
 *     scripts/clean-orphan-brand-profiles.ts --apply
 */

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { BrandProfile } from "@/lib/types/dashboard";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const redis = getRedis();

  const ids = (await redis.smembers(REDIS_KEYS.brandProfileList)) as string[];
  if (ids.length === 0) {
    console.log("No brand-profile records in Redis. Nothing to do.");
    return;
  }

  const orphans: { id: string; name: string }[] = [];
  let kept = 0;

  for (const id of ids) {
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));
    if (!profile) {
      // Stale index entry. Treat as orphan.
      orphans.push({ id, name: "<missing record>" });
      continue;
    }
    const demos = profile.demos ?? {};
    const hasDemo =
      Boolean(demos.earn) ||
      Boolean(demos.checkouts) ||
      Boolean(demos.wallet) ||
      Boolean(demos.remittance);
    if (hasDemo) {
      kept++;
    } else {
      orphans.push({ id, name: profile.name ?? "<unnamed>" });
    }
  }

  console.log(`scanned ${ids.length} brand-profile records`);
  console.log(`  ${kept} have at least one demo (kept)`);
  console.log(`  ${orphans.length} orphans (no demo links)`);

  if (orphans.length === 0) return;

  console.log("\nOrphans:");
  for (const o of orphans) {
    console.log(`  ${o.id}  —  ${o.name}`);
  }

  if (!APPLY) {
    console.log("\n(dry-run) re-run with --apply to delete.");
    return;
  }

  console.log("\nDeleting...");
  for (const o of orphans) {
    await redis.del(REDIS_KEYS.brandProfile(o.id));
    await redis.srem(REDIS_KEYS.brandProfileList, o.id);
    console.log(`  deleted ${o.id}`);
  }
  console.log(`\n${orphans.length} orphan(s) removed.`);
}

main().catch((err) => {
  process.stderr.write(
    `[clean-orphan-brand-profiles] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
