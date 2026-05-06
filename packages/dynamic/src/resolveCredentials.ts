/**
 * Resolve Dynamic credentials with the canonical fallback chain (D-003).
 *
 *   1. App-specific `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`
 *   2. Shared default `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT`
 *   3. Throw at boot — refuse to start without credentials.
 *
 * Sandbox-by-default (D-005): when `NEXT_PUBLIC_APP_ENV` !== `"production"`,
 * `isSandbox` is true. Apps may use `isSandbox` to gate production-only behavior.
 *
 * The function reads `process.env` by default but accepts overrides for testing
 * and for supplying values resolved elsewhere (e.g. from build-time config).
 */

export interface ResolveCredentialsOptions {
  appEnvironmentId?: string;
  defaultEnvironmentId?: string;
  appEnv?: string;
}

export interface ResolvedDynamicCredentials {
  environmentId: string;
  isSandbox: boolean;
}

const trimOrUndefined = (s: string | undefined | null): string | undefined =>
  s && s.trim() !== "" ? s.trim() : undefined;

export function resolveCredentials(
  options: ResolveCredentialsOptions = {},
): ResolvedDynamicCredentials {
  const appEnvironmentId =
    trimOrUndefined(options.appEnvironmentId) ??
    trimOrUndefined(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);
  const defaultEnvironmentId =
    trimOrUndefined(options.defaultEnvironmentId) ??
    trimOrUndefined(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT);
  const appEnv =
    trimOrUndefined(options.appEnv) ??
    trimOrUndefined(process.env.NEXT_PUBLIC_APP_ENV);

  const environmentId = appEnvironmentId ?? defaultEnvironmentId;
  if (!environmentId) {
    throw new Error(
      "Dynamic environment id missing — set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID (per app) or NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT (workspace default).",
    );
  }

  const isSandbox = appEnv !== "production";
  return { environmentId, isSandbox };
}
