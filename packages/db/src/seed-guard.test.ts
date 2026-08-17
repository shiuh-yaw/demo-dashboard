import { describe, expect, it } from "vitest";
import { assertSeedTargetAllowed, databaseIdentity } from "./seed-guard";

const PROD_REF = "tgmzgprod";
const BRANCH_REF = "kqzjsbranch";
const PASSWORD = "sup3r-s3cret-pw";

/** Pooler shape: ref in the username, region host shared with every project. */
function pooler(ref: string): string {
  return `postgresql://postgres.${ref}:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
}

describe("databaseIdentity", () => {
  it("reads the project ref from a pooler username", () => {
    expect(databaseIdentity(pooler(PROD_REF))).toBe(PROD_REF);
  });

  it("reads the project ref from a direct connection host", () => {
    expect(
      databaseIdentity(
        `postgresql://postgres:${PASSWORD}@db.${PROD_REF}.supabase.co:5432/postgres`,
      ),
    ).toBe(PROD_REF);
  });

  it("falls back to the host for a non-Supabase target", () => {
    expect(databaseIdentity("postgresql://postgres:pw@localhost:5432/db")).toBe(
      "localhost",
    );
  });

  it("distinguishes two projects sharing one pooler host", () => {
    expect(databaseIdentity(pooler(PROD_REF))).not.toBe(
      databaseIdentity(pooler(BRANCH_REF)),
    );
  });
});

describe("assertSeedTargetAllowed on a Vercel preview", () => {
  it("refuses when DATABASE_URL points somewhere other than the branch DB", () => {
    // The production incident: a Preview-scoped DATABASE_URL outranked the
    // injected branch URL, and a flag-only guard saw nothing wrong.
    expect(() =>
      assertSeedTargetAllowed({
        VERCEL_ENV: "preview",
        DATABASE_URL: pooler(PROD_REF),
        POSTGRES_PRISMA_URL: pooler(BRANCH_REF),
      }),
    ).toThrow(/Refusing to seed tgmzgprod.*branch database is kqzjsbranch/s);
  });

  it("allows the injected branch database", () => {
    expect(
      assertSeedTargetAllowed({
        VERCEL_ENV: "preview",
        POSTGRES_PRISMA_URL: pooler(BRANCH_REF),
      }),
    ).toBe(BRANCH_REF);
  });

  it("allows a DATABASE_URL that resolves to the same branch database", () => {
    expect(
      assertSeedTargetAllowed({
        VERCEL_ENV: "preview",
        DATABASE_URL: pooler(BRANCH_REF),
        POSTGRES_PRISMA_URL: pooler(BRANCH_REF),
      }),
    ).toBe(BRANCH_REF);
  });

  it("refuses when no branch database was injected", () => {
    expect(() =>
      assertSeedTargetAllowed({
        VERCEL_ENV: "preview",
        DATABASE_URL: pooler(PROD_REF),
      }),
    ).toThrow(/POSTGRES_PRISMA_URL is unset/);
  });
});

describe("assertSeedTargetAllowed elsewhere", () => {
  it("refuses outright on production", () => {
    expect(() =>
      assertSeedTargetAllowed({
        VERCEL_ENV: "production",
        DATABASE_URL: pooler(PROD_REF),
        ALLOW_SEED: PROD_REF,
      }),
    ).toThrow(/VERCEL_ENV is production/);
  });

  it("refuses a bare ALLOW_SEED=true", () => {
    expect(() =>
      assertSeedTargetAllowed({
        DATABASE_URL: pooler(PROD_REF),
        ALLOW_SEED: "true",
      }),
    ).toThrow(/ALLOW_SEED=tgmzgprod/);
  });

  it("refuses when ALLOW_SEED names a different database", () => {
    expect(() =>
      assertSeedTargetAllowed({
        DATABASE_URL: pooler(PROD_REF),
        ALLOW_SEED: BRANCH_REF,
      }),
    ).toThrow(/Refusing to seed tgmzgprod/);
  });

  it("allows the database the operator named", () => {
    expect(
      assertSeedTargetAllowed({
        DATABASE_URL: pooler(BRANCH_REF),
        ALLOW_SEED: BRANCH_REF,
      }),
    ).toBe(BRANCH_REF);
  });

  it("refuses with no connection string at all", () => {
    expect(() => assertSeedTargetAllowed({ ALLOW_SEED: "true" })).toThrow(
      /neither DATABASE_URL nor POSTGRES_PRISMA_URL/,
    );
  });

  it("never puts the database password in a refusal", () => {
    let message = "";
    try {
      assertSeedTargetAllowed({ DATABASE_URL: pooler(PROD_REF) });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain(PROD_REF);
    expect(message).not.toContain(PASSWORD);
  });
});
