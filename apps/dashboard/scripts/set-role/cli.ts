/**
 * set-role CLI (createsuperuser pattern). The only way the first OWNER comes
 * to exist - roles are never seeded from env.
 *
 * Usage:
 *   pnpm --filter @dynamic-demos/dashboard set-role <email> <ROLE>
 *   (ROLE: OWNER | ADMIN | MEMBER | VIEWER)
 *
 * Access control = possession of DATABASE_URL. Refuses unknown emails (never
 * creates) and invalid roles.
 *
 * Exit codes: 0 - role set; 1 - fatal (bad args, unknown email, invalid role).
 */

import { env } from "@/env";
import { gtmUserService } from "@/lib/services";

import { runSetRole, VALID_ROLES } from "./run";

async function main() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const [email, role] = process.argv.slice(2);
  if (!email || !role) {
    throw new Error(
      `usage: set-role <email> <ROLE>  (ROLE: ${VALID_ROLES.join(" | ")})`,
    );
  }

  const { before, after } = await runSetRole({
    users: gtmUserService,
    email,
    role,
    log: (m) => process.stdout.write(`${m}\n`),
  });

  process.stdout.write(`\nDone. ${email}: ${before} -> ${after}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `[set-role] ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
