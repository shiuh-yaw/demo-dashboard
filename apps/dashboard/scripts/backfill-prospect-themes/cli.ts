/**
 * Copies the flat Prospect palette into ProspectTheme for rows missing one.
 * Idempotent - safe to rerun anytime. Business logic is in run.ts.
 *
 * Usage:
 *   pnpm --filter @dynamic-demos/dashboard backfill:prospect-themes [--dry-run]
 */

import { prisma } from "@dynamic-demos/db";

import { runProspectThemesBackfill } from "./run";

// Column list is fixed (no user input); safe as a static raw statement.
const COPY_SQL = `
  INSERT INTO "ProspectTheme" (
    "id","prospectId","borderRadius","primaryColor","primaryHoverColor",
    "secondaryColor","accentColor","pageBackground","background","foreground",
    "mutedTextColor","borderColor","rowBackground","rowHoverBackground",
    "gradientFrom","gradientTo"
  )
  SELECT
    'ptheme_' || p."id", p."id", p."borderRadius", p."primaryColor",
    p."primaryHoverColor", p."secondaryColor", p."accentColor",
    p."pageBackground", p."background", p."foreground", p."mutedTextColor",
    p."borderColor", p."rowBackground", p."rowHoverBackground",
    p."gradientFrom", p."gradientTo"
  FROM "Prospect" p
  WHERE NOT EXISTS (
    SELECT 1 FROM "ProspectTheme" t WHERE t."prospectId" = p."id"
  )`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const report = await runProspectThemesBackfill({
    dryRun,
    countMissing: async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "Prospect" p
         WHERE NOT EXISTS (SELECT 1 FROM "ProspectTheme" t WHERE t."prospectId" = p."id")`,
      );
      return Number(rows[0]?.count ?? 0);
    },
    copyMissing: () => prisma.$executeRawUnsafe(COPY_SQL),
    log: (m) => process.stdout.write(`${m}\n`),
  });
  process.stdout.write(
    `\n=== ProspectTheme backfill${report.dryRun ? " (dry-run)" : ""} ===\n`,
  );
  process.stdout.write(`missing: ${report.missing}\n`);
  process.stdout.write(`copied:  ${report.copied}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `[backfill-prospect-themes] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
