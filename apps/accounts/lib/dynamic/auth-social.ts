"use client";

/**
 * Social (OAuth) authentication - initiate, then complete on redirect back.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/social
 */

import {
  authenticateWithSocial as sdkAuthenticateWithSocial,
  completeSocialAuthentication as sdkCompleteSocialAuthentication,
  detectOAuthRedirect as sdkDetectOAuthRedirect,
} from "@dynamic-labs-sdk/client";
import { getClient, createAsyncSafeWrapper } from "./client";

/** Start the provider's OAuth flow (redirects away). */
export const authenticateWithSocial = createAsyncSafeWrapper(
  sdkAuthenticateWithSocial,
);

/** Pure URL check - safe during SSR. */
export const detectOAuthRedirect = sdkDetectOAuthRedirect;

/** Finish the flow when the provider redirects back. */
export const completeSocialAuthentication = createAsyncSafeWrapper(
  sdkCompleteSocialAuthentication,
);

/** Social providers enabled in the dashboard for this environment. */
export function getEnabledSocialProviders(): string[] {
  const client = getClient();
  if (!client?.projectSettings) return [];

  return (
    client.projectSettings.sdk?.socialSignIn?.providers
      ?.filter((p) => p.enabled)
      .map((p) => p.provider) ?? []
  );
}

/** Is at least one social provider enabled? */
export function isSocialAuthEnabled(): boolean {
  return getEnabledSocialProviders().length > 0;
}
