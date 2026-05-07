/**
 * Redirect utilities for auth flow.
 * Ensures returnTo is safe (same-origin) to prevent open redirects.
 */

import type { AppAuthConfig } from "./schema";

/** Ensure returnTo is a same-origin path to prevent open redirects */
export function getSafeRedirectDest(
  returnToParam: string | null,
  baseUrl: string,
): string {
  const fallback = "/";
  if (!returnToParam?.trim()) return fallback;
  const dest = returnToParam.startsWith("/")
    ? returnToParam.replace(/\/+$/, "") || "/"
    : `/${returnToParam}`.replace(/\/+$/, "") || "/";
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(dest, base);
    return resolved.origin === base.origin ? resolved.pathname : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Build login URL with returnTo parameter.
 */
export function buildLoginUrl(
  baseUrl: string,
  config: AppAuthConfig,
  returnTo: string,
  configId?: string,
): string {
  const loginPath =
    config.routePattern === "config" && config.configParam && configId
      ? `/${config.configParam}/${configId}/login`
      : "/login";
  const url = new URL(loginPath, baseUrl);
  const safeReturnTo = getSafeRedirectDest(returnTo, baseUrl);
  url.searchParams.set("returnTo", safeReturnTo);
  if (configId && config.routePattern === "config") {
    url.searchParams.set("theme", configId);
  }
  return url.toString();
}
