"use client";

/**
 * Authentication - email OTP, social OAuth, session state.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/email
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/social
 */

import {
  authenticateWithSocial as sdkAuthenticateWithSocial,
  completeSocialAuthentication as sdkCompleteSocialAuthentication,
  detectOAuthRedirect as sdkDetectOAuthRedirect,
  isSignedIn as sdkIsSignedIn,
  logout as sdkLogout,
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  waitForClientInitialized as sdkWaitForClientInitialized,
  type OTPVerification,
  type SocialProvider,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper } from "./client";

export type { OTPVerification, SocialProvider };

export const isSignedIn = createSafeWrapper(sdkIsSignedIn, false);

export async function logout(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkLogout();
}

export function isEmailAuthEnabled(): boolean {
  const client = getClient();
  if (!client?.projectSettings) return false;
  const dynamicProvider = client.projectSettings.providers?.find((p) => p.provider === "dynamic");
  return dynamicProvider?.enabledAt != null;
}

/** Social providers enabled in the dashboard (e.g. ["google", "apple"]). */
export function getEnabledSocialProviders(): string[] {
  const client = getClient();
  if (!client?.projectSettings) return [];
  return (
    client.projectSettings.sdk?.socialSignIn?.providers?.filter((p) => p.enabled).map((p) => p.provider) ?? []
  );
}

export async function sendEmailOTP(params: { email: string }): Promise<OTPVerification> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkWaitForClientInitialized(client);
  return sdkSendEmailOTP(params);
}

export async function verifyOTP(params: { otpVerification: OTPVerification; verificationToken: string }) {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkWaitForClientInitialized(client);
  return sdkVerifyOTP(params);
}

/** Starts the redirect-based OAuth flow; the page comes back to `redirectUrl`. */
export async function authenticateWithSocial(params: { provider: SocialProvider; redirectUrl: string }) {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkWaitForClientInitialized(client);
  return sdkAuthenticateWithSocial(params);
}

/** True when the current URL is the return leg of a social sign-in. */
export async function detectOAuthRedirect(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  return sdkDetectOAuthRedirect({ url: new URL(window.location.href) });
}

export async function completeSocialAuthentication() {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkWaitForClientInitialized(client);
  return sdkCompleteSocialAuthentication({ url: new URL(window.location.href) });
}

/** Structural view of the parts of the user profile this demo reads. */
export interface UserLike {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  verifiedCredentials?: Array<{
    id?: string;
    address?: string | null;
    chain?: string | null;
    walletProvider?: string | null;
    embeddedWalletId?: string | null;
    oauthProvider?: string | null;
    oauthDisplayName?: string | null;
    oauthEmails?: string[] | null;
    email?: string | null;
    walletProperties?: {
      version?: string;
      thresholdSignatureScheme?: string;
      keyShares?: Array<{ id?: string; backupLocation?: string; passwordEncrypted?: boolean }>;
      otherShareSets?: Array<{ shareSetType?: string }>;
    } | null;
  }>;
}

export function getUser(): UserLike | null {
  const client = getClient();
  return (client?.user as UserLike | null | undefined) ?? null;
}
