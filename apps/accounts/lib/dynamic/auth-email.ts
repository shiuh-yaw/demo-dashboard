"use client";

/**
 * Email OTP authentication.
 *
 * `requestedScopes` is the one thing that differs from a plain sign-in: pass
 * it and the same verify call also mints an elevated access token, which is
 * what step-up uses to authorize signer / member mutations.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/email
 */

import {
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  waitForClientInitialized as sdkWaitForClientInitialized,
  type OTPVerification,
  type TokenScope,
  type VerifyResponse,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * Is email OTP enabled for this environment?
 *
 * The `dynamic` provider row is always present; `enabledAt` is only set when
 * email auth is turned on in the dashboard.
 */
export function isEmailAuthEnabled(): boolean {
  const client = getClient();
  if (!client?.projectSettings) return false;

  const dynamicProvider = client.projectSettings.providers?.find(
    (p) => p.provider === "dynamic",
  );
  return dynamicProvider?.enabledAt != null;
}

/** Send a one-time code to `email`. */
export async function sendEmailOTP(params: {
  email: string;
}): Promise<OTPVerification> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  await sdkWaitForClientInitialized(client);
  return sdkSendEmailOTP(params);
}

/**
 * Verify the code. Pass `requestedScopes` to elevate the session at the same
 * time (step-up) instead of only signing in.
 */
export async function verifyOTP(params: {
  otpVerification: OTPVerification;
  verificationToken: string;
  requestedScopes?: TokenScope[];
}): Promise<VerifyResponse> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  await sdkWaitForClientInitialized(client);
  return sdkVerifyOTP(params);
}
