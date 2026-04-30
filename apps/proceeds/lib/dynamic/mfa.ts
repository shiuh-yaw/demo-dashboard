"use client";

import {
  registerPasskey as sdkRegisterPasskey,
  signInWithPasskey as sdkSignInWithPasskey,
  getPasskeys as sdkGetPasskeys,
  authenticatePasskeyMFA as sdkAuthenticatePasskeyMFA,
  isUserMissingMfaAuth as sdkIsUserMissingMfaAuth,
  getMfaMethods as sdkGetMfaMethods,
  type UserPasskey,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export async function registerPasskey(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkRegisterPasskey();
}

export async function signInWithPasskey(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkSignInWithPasskey();
}

export async function getPasskeys(): Promise<UserPasskey[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await sdkGetPasskeys();
  } catch {
    return [];
  }
}

export async function hasRegisteredPasskeys(): Promise<boolean> {
  const passkeys = await getPasskeys();
  return passkeys.length > 0;
}

/**
 * Prompt the user to confirm a sensitive action with their registered passkey.
 * Creates a single-use MFA token that the next protected SDK call (e.g.
 * `sendUserOperation` via ZeroDev) consumes automatically.
 */
export async function confirmWithPasskeyMFA(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkAuthenticatePasskeyMFA({
    createMfaToken: { singleUse: true },
  });
}

export function getMfaSettings(): {
  isMfaEnabled: boolean;
  actionMfaEnabled: boolean;
} | null {
  const client = getClient();
  if (!client?.projectSettings) return null;

  const mfaConfig = client.projectSettings.security?.mfa;
  const sessionMfaEnabled = mfaConfig?.enabled ?? false;
  const actionMfaEnabled =
    mfaConfig?.actions?.some((a: { required?: boolean }) => a.required) ?? false;

  return {
    isMfaEnabled: sessionMfaEnabled || actionMfaEnabled,
    actionMfaEnabled,
  };
}

export function isUserMissingMfaAuth(): boolean {
  const client = getClient();
  if (!client) return false;
  try {
    return sdkIsUserMissingMfaAuth();
  } catch {
    return false;
  }
}

export async function getMfaMethods(): Promise<{
  passkeys: UserPasskey[];
  devices: unknown[];
}> {
  const client = getClient();
  if (!client) return { passkeys: [], devices: [] };
  try {
    return await sdkGetMfaMethods();
  } catch {
    return { passkeys: [], devices: [] };
  }
}

export async function completeSessionMfa(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkAuthenticatePasskeyMFA();
}
