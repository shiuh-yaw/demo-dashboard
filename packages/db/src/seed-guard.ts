/**
 * Proves the database about to be seeded is not production.
 *
 * The previous guard trusted flags - `VERCEL_ENV=preview` or
 * `ALLOW_SEED=true` - neither of which says anything about where
 * DATABASE_URL points. A preview build that inherited the production
 * connection string satisfied it and seeded production. Every check here
 * compares the connection the seed will actually open.
 */

/**
 * Supabase project ref, or the bare host for non-Supabase targets. Identifies
 * a database without carrying its password, so it is safe to log.
 */
export function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  // Pooler URLs put the ref in the username; the host is shared across every
  // project in the region, so the host alone cannot tell prod from a branch.
  const pooled = /^postgres\.(.+)$/.exec(decodeURIComponent(parsed.username));
  if (pooled?.[1]) return pooled[1];
  const direct = /^db\.([a-z0-9]+)\.supabase\.(?:co|com)$/i.exec(
    parsed.hostname,
  );
  if (direct?.[1]) return direct[1];
  return parsed.hostname;
}

export interface SeedEnv {
  DATABASE_URL?: string;
  /** Injected by the Supabase branch integration on a Vercel preview. */
  POSTGRES_PRISMA_URL?: string;
  VERCEL_ENV?: string;
  ALLOW_SEED?: string;
}

/**
 * Throws unless the resolved target is provably disposable. Returns the
 * target's identity so the caller can log what it seeded.
 */
export function assertSeedTargetAllowed(env: SeedEnv): string {
  // Same precedence the seed's own Prisma client uses.
  const target = env.DATABASE_URL || env.POSTGRES_PRISMA_URL;
  if (!target) {
    throw new Error(
      "Refusing to seed: neither DATABASE_URL nor POSTGRES_PRISMA_URL is set.",
    );
  }

  let identity: string;
  try {
    identity = databaseIdentity(target);
  } catch {
    throw new Error(
      "Refusing to seed: the connection string is not a parseable URL, so " +
        "the target database cannot be identified.",
    );
  }

  if (env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed: VERCEL_ENV is production.");
  }

  if (env.VERCEL_ENV === "preview") {
    const branch = env.POSTGRES_PRISMA_URL;
    if (!branch) {
      throw new Error(
        `Refusing to seed ${identity}: POSTGRES_PRISMA_URL is unset, so this ` +
          "preview has no Supabase branch database and nothing proves the " +
          "target is ephemeral.",
      );
    }
    const branchIdentity = databaseIdentity(branch);
    if (branchIdentity !== identity) {
      throw new Error(
        `Refusing to seed ${identity}: this preview's branch database is ` +
          `${branchIdentity}, so DATABASE_URL is pointing somewhere else. ` +
          "Scope DATABASE_URL out of the Vercel Preview environment.",
      );
    }
    return identity;
  }

  // Local or manual run: the operator names the database they mean to wipe,
  // and the guard checks the connection actually goes there.
  if (env.ALLOW_SEED !== identity) {
    throw new Error(
      `Refusing to seed ${identity}: set ALLOW_SEED=${identity} to confirm ` +
        "that is a throwaway database. ALLOW_SEED=true is not accepted - it " +
        "passed regardless of which database DATABASE_URL pointed at.",
    );
  }
  return identity;
}
