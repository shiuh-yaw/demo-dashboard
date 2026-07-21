/**
 * I1 - `IP_HASH_SALT` must fail closed in production. The zod default
 * ("local-dev-ip-hash-salt") is committed to the repo, so leaving it in a
 * deployed environment makes `VisitorSession.ipHash` reversible
 * (sha256(ip + known-salt) is a trivial precompute over the IPv4 space).
 * Dev/test keep the fallback so local runs need no setup.
 *
 * `@/env` is a module-level singleton (`createEnv` runs at import time), so
 * each case resets the module registry and re-imports fresh with the env
 * vars for that scenario in place. Env vars are unset via `delete` (not
 * `vi.stubEnv("", "")`) so the zod `.optional().default(...)` fallback path
 * is actually exercised - an empty string is a defined value, not absence.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const ORIGINAL_SALT = process.env.IP_HASH_SALT;

function setEnv(name: string, value: string | undefined) {
  const procEnv = process.env as Record<string, string | undefined>;
  if (value === undefined) delete procEnv[name];
  else procEnv[name] = value;
}

async function importEnvFresh() {
  vi.resetModules();
  return import("@/env");
}

describe("env - IP_HASH_SALT fails closed in production (I1)", () => {
  afterEach(() => {
    setEnv("NEXT_PUBLIC_APP_ENV", ORIGINAL_APP_ENV);
    setEnv("IP_HASH_SALT", ORIGINAL_SALT);
  });

  it("throws at import time when NEXT_PUBLIC_APP_ENV=production and IP_HASH_SALT is unset", async () => {
    setEnv("NEXT_PUBLIC_APP_ENV", "production");
    setEnv("IP_HASH_SALT", undefined);

    await expect(importEnvFresh()).rejects.toThrow(/IP_HASH_SALT/);
  });

  it("does not throw when NEXT_PUBLIC_APP_ENV=production and IP_HASH_SALT is set", async () => {
    setEnv("NEXT_PUBLIC_APP_ENV", "production");
    setEnv("IP_HASH_SALT", "a-real-random-production-salt");

    const mod = await importEnvFresh();
    expect(mod.env.IP_HASH_SALT).toBe("a-real-random-production-salt");
  });

  it("falls back to the dev default outside production when IP_HASH_SALT is unset", async () => {
    setEnv("NEXT_PUBLIC_APP_ENV", "development");
    setEnv("IP_HASH_SALT", undefined);

    const mod = await importEnvFresh();
    expect(mod.env.IP_HASH_SALT).toBe("local-dev-ip-hash-salt");
  });

  it("falls back to the dev default when NEXT_PUBLIC_APP_ENV is unset entirely", async () => {
    setEnv("NEXT_PUBLIC_APP_ENV", undefined);
    setEnv("IP_HASH_SALT", undefined);

    const mod = await importEnvFresh();
    expect(mod.env.IP_HASH_SALT).toBe("local-dev-ip-hash-salt");
  });
});
