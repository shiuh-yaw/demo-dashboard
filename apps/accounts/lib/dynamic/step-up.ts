"use client";

/**
 * Step-up authentication - the elevation every signer / member mutation needs.
 *
 * Business-account mutations are gated on a scoped elevated access token
 * (`TokenScope.BusinessAccount*`). The SDK attaches the token automatically
 * once one exists; getting one is the app's job: check, re-verify the user
 * with a credential they already have, passing the scope as
 * `requestedScopes`, then perform the operation.
 *
 * There is no built-in UI in the JavaScript SDK, so this module exposes the
 * primitives and `components/step-up/step-up-provider.tsx` renders the modal.
 *
 * @see https://www.dynamic.xyz/docs/javascript/building-ui/step-up-authentication
 */

import {
  authenticatePasskeyMFA as sdkAuthenticatePasskeyMFA,
  authenticateTotpMfaDevice as sdkAuthenticateTotpMfaDevice,
  checkStepUpAuth as sdkCheckStepUpAuth,
  TokenScope,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export { TokenScope };

/**
 * One credential the user can present, as returned by `checkStepUpAuth`.
 *
 * Structurally narrower than the SDK's `StepUpCredential` on purpose:
 * `format` is widened to `string` so a new credential family added upstream
 * lands in the "unsupported" branch of the UI instead of failing to compile.
 */
export interface StepUpCredentialOption {
  id: string;
  format: string;
  type?: string;
  alias?: string;
}

export interface StepUpCheck {
  isRequired: boolean;
  credentials: StepUpCredentialOption[];
  defaultCredentialId?: string;
}

/**
 * Scopes bundled into one elevated token the first time the user steps up,
 * so the second and third mutation in a session don't each re-prompt.
 *
 * `BusinessAccounttransferOwnership` is deliberately absent: the server
 * issues a single-use token for it, so it must be requested on its own.
 */
export const BUSINESS_ACCOUNT_SESSION_SCOPES: TokenScope[] = [
  TokenScope.BusinessAccountlinkWallet,
  TokenScope.BusinessAccountmemberadd,
  TokenScope.BusinessAccountmemberremove,
  TokenScope.BusinessAccountmemberroleupdate,
  TokenScope.BusinessAccountsigneradd,
  TokenScope.BusinessAccountsignerremove,
  TokenScope.BusinessAccountwalletremove,
];

/**
 * Every scope this app can request, for the panel + the modal copy. Ordered
 * as the flow encounters them.
 */
export const BUSINESS_ACCOUNT_SCOPES: TokenScope[] = [
  ...BUSINESS_ACCOUNT_SESSION_SCOPES,
  TokenScope.BusinessAccounttransferOwnership,
];

/**
 * The extra scopes to bundle alongside `scope`, or undefined when `scope`
 * must stand alone (single-use tokens).
 */
export function additionalScopesFor(
  scope: TokenScope,
): TokenScope[] | undefined {
  if (!BUSINESS_ACCOUNT_SESSION_SCOPES.includes(scope)) return undefined;
  return BUSINESS_ACCOUNT_SESSION_SCOPES.filter((s) => s !== scope);
}

/**
 * Does this action need step-up right now, and with which credentials?
 *
 * Fails closed: the SDK returns `{ isRequired: true, credentials: [] }` when
 * its check request fails, which the modal renders as "no credential
 * available" rather than a dead-end empty picker.
 */
export async function checkStepUpAuth(params: {
  scope: TokenScope;
}): Promise<StepUpCheck> {
  const client = getClient();
  if (!client) return { isRequired: true, credentials: [] };
  const result = await sdkCheckStepUpAuth(params, client);
  return {
    isRequired: result.isRequired,
    credentials: result.credentials as StepUpCredentialOption[],
    defaultCredentialId: result.defaultCredentialId,
  };
}

/** Elevate via an authenticator app code. */
export async function authenticateTotp(params: {
  code: string;
  requestedScopes: TokenScope[];
}): Promise<unknown> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkAuthenticateTotpMfaDevice(params);
}

/** Elevate via a registered passkey. */
export async function authenticatePasskey(params: {
  requestedScopes: TokenScope[];
}): Promise<unknown> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkAuthenticatePasskeyMFA(params);
}
