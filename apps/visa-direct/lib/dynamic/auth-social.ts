"use client";

/**
 * Social Authentication (OAuth)
 *
 * Google and other social provider authentication flows.
 * Handles the redirect-based OAuth flow: initiate → redirect → complete.
 */

import {
  authenticateWithSocial as sdkAuthenticateWithSocial,
  detectOAuthRedirect as sdkDetectOAuthRedirect,
  completeSocialAuthentication as sdkCompleteSocialAuthentication,
} from "@dynamic-labs-sdk/client";
import { getClient, createAsyncSafeWrapper } from "./client";

export const authenticateWithSocial = createAsyncSafeWrapper(
  sdkAuthenticateWithSocial,
);

export const detectOAuthRedirect = createAsyncSafeWrapper(
  sdkDetectOAuthRedirect,
);

export const completeSocialAuthentication = createAsyncSafeWrapper(
  sdkCompleteSocialAuthentication,
);

export function getEnabledSocialProviders(): string[] {
  const client = getClient();
  if (!client?.projectSettings) return [];

  return (
    client.projectSettings.sdk?.socialSignIn?.providers
      ?.filter((p) => p.enabled)
      .map((p) => p.provider) ?? []
  );
}

export function isSocialAuthEnabled(): boolean {
  return getEnabledSocialProviders().length > 0;
}
