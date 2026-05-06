/**
 * Tests for resolveCredentials.
 *
 * Sandbox-by-default (D-005): refuses production opt-in unless an explicit
 * production env id is supplied AND `NEXT_PUBLIC_APP_ENV=production`.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveCredentials } from "../resolveCredentials";

const ENV_KEYS = [
  "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID",
  "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT",
  "NEXT_PUBLIC_APP_ENV",
];

describe("resolveCredentials", () => {
  const original: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) original[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it("returns the app-specific env id when set", () => {
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID = "app-specific";
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT = "default";
    expect(resolveCredentials().environmentId).toBe("app-specific");
  });

  it("falls back to the shared default env id when app id is unset", () => {
    delete process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT = "shared-default";
    expect(resolveCredentials().environmentId).toBe("shared-default");
  });

  it("throws when neither app id nor default is set", () => {
    delete process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
    delete process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT;
    expect(() => resolveCredentials()).toThrow(/environment/i);
  });

  it("flags isSandbox=true when NEXT_PUBLIC_APP_ENV is not 'production'", () => {
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID = "x";
    delete process.env.NEXT_PUBLIC_APP_ENV;
    expect(resolveCredentials().isSandbox).toBe(true);
  });

  it("flags isSandbox=false when NEXT_PUBLIC_APP_ENV='production'", () => {
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID = "x";
    process.env.NEXT_PUBLIC_APP_ENV = "production";
    expect(resolveCredentials().isSandbox).toBe(false);
  });

  it("accepts an explicit override map", () => {
    expect(
      resolveCredentials({
        appEnvironmentId: "from-arg",
        defaultEnvironmentId: "ignored",
      }).environmentId,
    ).toBe("from-arg");
  });
});
