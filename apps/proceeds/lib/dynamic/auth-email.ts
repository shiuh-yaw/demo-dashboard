"use client";

import {
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  waitForClientInitialized as sdkWaitForClientInitialized,
  type OTPVerification,
  type VerifyResponse,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export function isEmailAuthEnabled(): boolean {
  const client = getClient();
  if (!client?.projectSettings) return false;

  const dynamicProvider = client.projectSettings.providers?.find(
    (p) => p.provider === "dynamic",
  );
  return dynamicProvider?.enabledAt != null;
}

export async function sendEmailOTP(params: {
  email: string;
}): Promise<OTPVerification> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  await sdkWaitForClientInitialized(client);
  return sdkSendEmailOTP(params);
}

export async function verifyOTP(params: {
  otpVerification: OTPVerification;
  verificationToken: string;
}): Promise<VerifyResponse> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  await sdkWaitForClientInitialized(client);
  return sdkVerifyOTP(params);
}
