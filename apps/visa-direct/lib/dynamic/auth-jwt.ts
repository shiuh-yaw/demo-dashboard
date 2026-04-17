"use client";

/**
 * External JWT Authentication
 *
 * Sign in using a third-party JWT token from an external auth provider.
 */

import { signInWithExternalJwt as sdkSignInWithExternalJwt } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";
import { waitForClientInitialized } from "./init";

export async function signInWithExternalJwt(params: {
  externalJwt: string;
}): Promise<Awaited<ReturnType<typeof sdkSignInWithExternalJwt>>> {
  await waitForClientInitialized();
  return sdkSignInWithExternalJwt({ externalJwt: params.externalJwt });
}

export function isExternalAuthEnabled(): boolean {
  const client = getClient();
  if (!client?.projectSettings) return false;

  const externalAuth = client.projectSettings.security?.externalAuth;
  return externalAuth?.enabled ?? false;
}
