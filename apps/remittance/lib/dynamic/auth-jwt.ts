"use client";

/**
 * External JWT Authentication
 *
 * Sign in using a third-party JWT token from an external auth provider.
 * Requires External Authentication to be configured in the Dynamic dashboard.
 *
 * @see https://www.dynamic.xyz/docs/javascript/external-auth/third-party-auth-overview
 */

import { signInWithExternalJwt as sdkSignInWithExternalJwt } from "@dynamic-labs-sdk/client";
import { getClient, createAsyncSafeWrapper } from "./client";

/** Sign in with an external JWT token */
export const signInWithExternalJwt = createAsyncSafeWrapper(
  sdkSignInWithExternalJwt,
);

/**
 * Check if External Authentication (JWT) is enabled in the dashboard.
 */
export function isExternalAuthEnabled(): boolean {
  const client = getClient();
  if (!client?.projectSettings) return false;

  const externalAuth = client.projectSettings.security?.externalAuth;
  return externalAuth?.enabled ?? false;
}
