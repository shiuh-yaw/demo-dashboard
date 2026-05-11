"use client";

/**
 * Dynamic SDK auth helpers — capability checks, email OTP, external JWT,
 * social provider list. Re-exports SDK functions earn needs in the new
 * `LoginForm`-driven auth surface (mirrors `apps/remittance/lib/dynamic/`
 * but lives in a single file because earn has fewer auth modes).
 *
 * Capability checks read `client.projectSettings` — populated by the SDK
 * after `initializeClient` resolves. They're called from `<LoginForm>`
 * synchronously in render, so they short-circuit safely when the client
 * isn't initialized yet (return false / empty array).
 */

import {
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  signInWithExternalJwt as sdkSignInWithExternalJwt,
  type OTPVerification,
  type VerifyResponse,
} from "@dynamic-labs-sdk/client";
import { getDynamicClient, waitForClientInitialized } from "@/lib/dynamic";

function safeGetClient() {
  if (typeof window === "undefined") return null;
  try {
    return getDynamicClient();
  } catch {
    return null;
  }
}

export function isEmailAuthEnabled(): boolean {
  const client = safeGetClient();
  if (!client?.projectSettings) return false;
  const dynamicProvider = client.projectSettings.providers?.find(
    (p) => p.provider === "dynamic",
  );
  return dynamicProvider?.enabledAt != null;
}

export function getEnabledSocialProviders(): string[] {
  const client = safeGetClient();
  if (!client?.projectSettings) return [];
  return (
    client.projectSettings.sdk?.socialSignIn?.providers
      ?.filter((p) => p.enabled)
      .map((p) => p.provider) ?? []
  );
}

export function isExternalAuthEnabled(): boolean {
  const client = safeGetClient();
  if (!client?.projectSettings) return false;
  return client.projectSettings.security?.externalAuth?.enabled ?? false;
}

export async function sendEmailOTP(params: {
  email: string;
}): Promise<OTPVerification> {
  await waitForClientInitialized();
  return sdkSendEmailOTP(params);
}

export async function verifyOTP(params: {
  otpVerification: OTPVerification;
  verificationToken: string;
}): Promise<VerifyResponse> {
  await waitForClientInitialized();
  return sdkVerifyOTP(params);
}

export async function signInWithExternalJwt(params: {
  externalJwt: string;
}): Promise<Awaited<ReturnType<typeof sdkSignInWithExternalJwt>>> {
  await waitForClientInitialized();
  return sdkSignInWithExternalJwt({ externalJwt: params.externalJwt });
}

export type { OTPVerification };
