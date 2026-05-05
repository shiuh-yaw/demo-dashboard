/**
 * Iron Finance environment + endpoint resolution.
 *
 * Sandbox-by-default per D-005. Callers can pass `env: 'sandbox' | 'production'`
 * explicitly or let the package read it from `process.env.IRON_ENVIRONMENT`.
 */

export type IronEnvironment = "sandbox" | "production";

const SANDBOX_BASE_URL = "https://api.sandbox.iron.xyz";
const PRODUCTION_BASE_URL = "https://api.iron.xyz";

/**
 * Resolve the Iron API base URL for a given environment.
 */
export function resolveIronBaseUrl(env: IronEnvironment): string {
  return env === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * Resolve the environment from an explicit value or `IRON_ENVIRONMENT`.
 * Defaults to `sandbox` (D-005 sandbox-by-default).
 */
export function resolveIronEnvironment(
  override?: IronEnvironment,
): IronEnvironment {
  if (override) return override;
  const fromEnv = process.env.IRON_ENVIRONMENT;
  return fromEnv === "production" ? "production" : "sandbox";
}
