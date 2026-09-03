"use client";

/**
 * Step-up authentication for linking a credential (beat 2 curveball).
 *
 * Environments with step-up enforced reject a wallet link unless the request
 * carries a short-lived elevated access token scoped `credential:link`. The
 * SDK mints and stores that token when a re-verification call is made with
 * `requestedScopes`, but (through 1.31) `connectAndVerifyWithWalletProvider`
 * never attaches it to the link request. `linkStepUpHeaders` closes that gap:
 * the client's `coreConfig.getApiHeaders` adds the header while a link is in
 * flight, and only then.
 *
 * @see https://www.dynamic.xyz/docs/overview/authentication/step-up-auth
 */

import {
  checkStepUpAuth as sdkCheckStepUpAuth,
  getDefaultClient as sdkGetDefaultClient,
  getElevatedAccessToken as sdkGetElevatedAccessToken,
  verifyWalletAccount as sdkVerifyWalletAccount,
  TokenScope,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";

export const LINK_SCOPE = TokenScope.Credentiallink;
const ELEVATED_ACCESS_TOKEN_HEADER = "x-dyn-elevated-access-token";

let attachLinkToken = false;

/** Wired into `createDynamicClient({ coreConfig: { getApiHeaders } })`. */
export function linkStepUpHeaders(): Record<string, string> {
  if (!attachLinkToken) return {};
  try {
    const token = sdkGetElevatedAccessToken({ scope: LINK_SCOPE, consume: false }, sdkGetDefaultClient());
    return token ? { [ELEVATED_ACCESS_TOKEN_HEADER]: token } : {};
  } catch {
    return {};
  }
}

/** Run a credential-link call with the elevated token attached; drop a single-use token afterwards. */
export async function withLinkStepUp<T>(fn: () => Promise<T>): Promise<T> {
  attachLinkToken = true;
  try {
    return await fn();
  } finally {
    attachLinkToken = false;
    try {
      sdkGetElevatedAccessToken({ scope: LINK_SCOPE, consume: true });
    } catch {
      /* nothing to drop */
    }
  }
}

/** True when a valid `credential:link` token is already in the SDK's state. */
export function hasLinkToken(): boolean {
  try {
    return Boolean(sdkGetElevatedAccessToken({ scope: LINK_SCOPE, consume: false }));
  } catch {
    return false;
  }
}

export type LinkStepUp =
  | { kind: "none" }
  /** The embedded wallet is itself an accepted credential: sign a message, no UI. */
  | { kind: "wallet" }
  | { kind: "email"; email: string }
  | { kind: "social"; provider: string }
  | { kind: "unsupported"; formats: string[] };

/**
 * Ask the backend whether linking needs step-up and which of the user's
 * credentials can satisfy it. Preference: silent embedded-wallet signature,
 * then an email code, then a social round trip.
 */
export async function checkLinkStepUp(params: { embedded?: WalletAccount; email?: string }): Promise<LinkStepUp> {
  if (hasLinkToken()) return { kind: "none" };
  const result = await sdkCheckStepUpAuth({ scope: LINK_SCOPE });
  if (!result.isRequired) return { kind: "none" };
  const creds = result.credentials ?? [];
  const embeddedId = params.embedded?.verifiedCredentialId;
  if (embeddedId && creds.some((c) => c.format === "blockchain" && c.id === embeddedId)) return { kind: "wallet" };
  const email = creds.find((c) => c.format === "email");
  if (email) return { kind: "email", email: email.alias ?? params.email ?? "" };
  const social = creds.find((c) => c.format === "oauth");
  if (social) return { kind: "social", provider: social.type ?? "google" };
  // Empty list (the check failed closed): try the wallet signature, it is the only silent option.
  if (creds.length === 0 && params.embedded) return { kind: "wallet" };
  return { kind: "unsupported", formats: creds.map((c) => c.format) };
}

/** Prove ownership of an already-verified wallet to mint the link token. Silent for the embedded wallet. */
export async function mintLinkTokenWithWallet(walletAccount: WalletAccount): Promise<void> {
  await sdkVerifyWalletAccount({ walletAccount, requestedScopes: [LINK_SCOPE] });
  if (!hasLinkToken()) throw new Error("Re-verification succeeded but no elevated token came back for credential:link.");
}
