"use client";

/**
 * MFA (Multi-Factor Authentication)
 *
 * Action-based MFA using TOTP (Time-based One-Time Passwords) to protect
 * sensitive operations like transactions.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/mfa/action-based
 */

import {
  acknowledgeRecoveryCodes as sdkAcknowledgeRecoveryCodes,
  authenticatePasskeyMFA as sdkAuthenticatePasskeyMFA,
  authenticateTotpMfaDevice as sdkAuthenticateTotpMfaDevice,
  deleteMfaDevice as sdkDeleteMfaDevice,
  deletePasskey as sdkDeletePasskey,
  getMfaDevices as sdkGetMfaDevices,
  getMfaRecoveryCodes as sdkGetMfaRecoveryCodes,
  getPasskeys as sdkGetPasskeys,
  isPendingRecoveryCodesAcknowledgment as sdkIsPendingRecoveryCodesAcknowledgment,
  isUserMissingMfaAuth as sdkIsUserMissingMfaAuth,
  registerPasskey as sdkRegisterPasskey,
  registerTotpMfaDevice as sdkRegisterTotpMfaDevice,
  isMfaRequiredForAction as sdkIsMfaRequiredForAction,
  MFAAction,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/** The factors this app can enroll and step up with. */
export type MfaMethod = "totp" | "passkey";

/**
 * Authenticate with a TOTP (Time-based One-Time Password) MFA device.
 *
 * Use this before performing MFA-protected actions like transactions.
 * Pass `createMfaTokenOptions: { singleUse: true }` to create a token
 * that's consumed by the next protected operation.
 *
 * @example
 * ```ts
 * await authenticateTotpMfaDevice({
 *   code: "123456",
 *   createMfaTokenOptions: { singleUse: true },
 * });
 * // Now send the transaction...
 * ```
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/mfa/action-based
 */
export const authenticateTotpMfaDevice = sdkAuthenticateTotpMfaDevice;

/**
 * Step up with a passkey. Prompts the OS/browser - there is no code to type.
 *
 * Note this consumes the user's **sign-in passkeys**: Dynamic has no separate
 * passkey MFA-device registry, so `getMfaDevices()` never lists one and
 * `getPasskeys()` is the source of truth for "has a passkey enrolled".
 */
export const authenticatePasskeyMFA = sdkAuthenticatePasskeyMFA;

/** Register a passkey. Doubles as passkey MFA enrollment - see above. */
export const registerPasskey = sdkRegisterPasskey;

/** Whether this browser can do WebAuthn at all (TOTP is the fallback). */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/**
 * Mint the single-use token the next WaaS operation consumes.
 *
 * The one place that knows how each factor differs - the SDK spells the
 * token option differently per method (`createMfaTokenOptions` vs
 * `createMfaToken`), and only TOTP takes a code. Adding a factor means
 * editing here, not every call site.
 *
 * Both options are marked deprecated in favour of `requestedScopes`, which
 * is NOT a substitute: it returns an elevated access token, and the WaaS
 * path consumes an MFA token.
 */
export async function mintMfaToken(params: {
  method: MfaMethod;
  /** Required for TOTP, unused for passkey. */
  code?: string;
}): Promise<string | undefined> {
  // The WaaS path reads the token off client state, but the credential APIs
  // take it as an argument - so hand it back for those callers.
  if (params.method === "passkey") {
    const response = await sdkAuthenticatePasskeyMFA({
      createMfaToken: { singleUse: true },
    });
    return response.mfaToken;
  }
  if (!params.code) throw new Error("An authenticator code is required");
  const response = await sdkAuthenticateTotpMfaDevice({
    code: params.code,
    createMfaTokenOptions: { singleUse: true },
  });
  return response.mfaToken;
}

/**
 * Remove an enrolled factor. Both SDK calls need an elevated token scoped
 * `credential:unlink`, and `deleteMfaDevice` takes the MFA token explicitly
 * - so removing a factor is itself a step-up-protected action.
 */
export async function deleteMfaFactor(params: {
  factor: { kind: "passkey" | "mfa"; id: string };
  stepUp: { method: MfaMethod; code?: string };
}): Promise<void> {
  const mfaToken = await mintMfaToken(params.stepUp);
  if (params.factor.kind === "passkey") {
    await sdkDeletePasskey({ passkeyId: params.factor.id });
    return;
  }
  await sdkDeleteMfaDevice({ deviceId: params.factor.id, mfaAuthToken: mfaToken });
}

/**
 * Get all registered MFA devices for the current user.
 *
 * Use this to check if the user has MFA set up before prompting for a code.
 * Returns an empty array if no devices are registered.
 */
export async function getMfaDevices() {
  const client = getClient();
  if (!client) return [];

  try {
    return await sdkGetMfaDevices();
  } catch {
    return [];
  }
}

/**
 * Register a new TOTP MFA device for the current user.
 *
 * Returns a URI for generating a QR code and a secret key for manual entry.
 * After registration, the user must verify the device using `authenticateTotpMfaDevice`.
 *
 * @returns { uri: string, secret: string } - URI for QR code and secret for manual entry
 *
 * @see https://dynamic.xyz/docs/javascript/authentication-methods/mfa/totp
 */
export const registerTotpMfaDevice = sdkRegisterTotpMfaDevice;

/**
 * Check if MFA is required for a specific action.
 *
 * Use this to determine if the user needs to complete an MFA challenge
 * before performing sensitive operations.
 *
 * @example
 * ```ts
 * const required = await isMfaRequiredForAction({
 *   mfaAction: MFAAction.WalletWaasSign,
 * });
 * if (required) {
 *   // Prompt for MFA code
 * }
 * ```
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/mfa/action-based#your-ui-sdk-implementation
 */
export const isMfaRequiredForAction = sdkIsMfaRequiredForAction;

// Re-export MFAAction enum for use in components
export { MFAAction };

/**
 * Whether an MFA onboarding step is still outstanding for this user. Until
 * it clears, the backend withholds `user:basic` and every WaaS call - sign,
 * send, export, backup - throws WaasOnboardingIncompleteError before any
 * step-up logic runs. A code can't help; finishing onboarding can.
 *
 * Two branches, both MFA-owned: enrollment not done
 * (`requiresAdditionalAuth` on the scope), and recovery codes issued but
 * unacknowledged - the easy one to miss, since it appears only AFTER a
 * successful enrollment when the method has `allowBackupCodes`.
 * `isUserOnboardingComplete()` also covers KYC fields and device
 * registration; those are deliberately excluded, since this app's Shield
 * routes to MFA setup and could not resolve them.
 */
export function isMfaOnboardingPending(): boolean {
  const client = getClient();
  if (!client?.user) return false;
  try {
    return sdkIsUserMissingMfaAuth() || sdkIsPendingRecoveryCodesAcknowledgment();
  } catch {
    return false;
  }
}

/**
 * Registered passkeys for the current user. Sign-in passkeys and passkey MFA
 * devices are separate records; this is the former.
 */
export async function getPasskeys() {
  const client = getClient();
  if (!client?.user) return [];
  try {
    return await sdkGetPasskeys();
  } catch {
    return [];
  }
}

/** Whether recovery codes are issued but not yet acknowledged. */
export function isRecoveryCodesPending(): boolean {
  const client = getClient();
  if (!client?.user) return false;
  try {
    return sdkIsPendingRecoveryCodesAcknowledgment();
  } catch {
    return false;
  }
}

/**
 * Fetch the user's MFA recovery codes, creating them if none exist.
 * Show these once, then call `acknowledgeRecoveryCodes`.
 */
export const getMfaRecoveryCodes = sdkGetMfaRecoveryCodes;

/**
 * Mark recovery codes as saved. Required to finish onboarding whenever the
 * enrolled method allows backup codes - without it the user is stuck with a
 * verified authenticator and an unusable wallet.
 */
export const acknowledgeRecoveryCodes = sdkAcknowledgeRecoveryCodes;

/**
 * MFA Settings from environment configuration
 */
export interface MfaSettings {
  /** Whether session-based MFA (a code at login) is enabled */
  sessionMfaEnabled: boolean;
  /** Whether MFA enrollment is forced (on signup or on protected action) */
  mfaRequired: boolean;
  /** Whether any protected action requires a step-up */
  actionMfaEnabled: boolean;
  /** Whether the authenticator-app (TOTP) method is enabled */
  totpEnabled: boolean;
  /** Whether the passkey method is enabled */
  passkeyEnabled: boolean;
  /** Whether any MFA method is enabled in the environment */
  isMfaEnabled: boolean;
  /** Whether a method this app can actually enroll is enabled */
  canEnrollMfa: boolean;
}

/**
 * Methods this app can enroll today. `SetupMfaScreen` registers TOTP only;
 * add "passkey" here once it registers passkeys too (SDK:
 * `authenticatePasskeyMFA`) - every enrollment gate reads this.
 */
export const ENROLLABLE_MFA_METHODS: readonly MfaMethod[] = [
  "totp",
  "passkey",
];

/** The `methods` / `enrollment` fields aren't on the SDK's settings type. */
type MfaConfigShape = {
  enabled?: boolean;
  required?: boolean;
  enrollment?: string;
  actions?: { action?: string; required?: boolean }[];
  methods?: { type?: string; enabled?: boolean }[];
  availableMethods?: string[];
};

/**
 * Whether the environment protects an action. Pure, so it can be tested
 * against a settings payload.
 */
export function isActionProtected(
  mfaConfig: MfaConfigShape | null | undefined,
  mfaAction: string,
): boolean {
  return (
    mfaConfig?.actions?.some((a) => a.action === mfaAction && a.required) ??
    false
  );
}

/**
 * The environment's policy for an action, independent of this user.
 *
 * NOT interchangeable with `isMfaRequiredForAction`: that one ends in
 * `userHasVerifiedMfaMethods`, so it answers "not required" for a user with
 * nothing enrolled - while the backend still enforces the action and rejects
 * the call. Enrollment decisions must read the policy, not the user.
 */
export function isActionProtectedForEnvironment(mfaAction: string): boolean {
  const client = getClient();
  return isActionProtected(
    client?.projectSettings?.security?.mfa as MfaConfigShape | undefined,
    mfaAction,
  );
}

/**
 * Get MFA settings from the environment configuration.
 *
 * This provides direct access to MFA settings from projectSettings,
 * which is more reliable than checking individual actions.
 *
 * @returns MFA settings or null if client not initialized
 */
export function getMfaSettings(): MfaSettings | null {
  const client = getClient();
  if (!client?.projectSettings) return null;

  const mfaConfig = client.projectSettings.security?.mfa as
    | MfaConfigShape
    | undefined;

  // Which factors the environment offers. NOT `availableMethods` - that's the
  // platform catalog and still lists a method whose `methods[].enabled` is
  // false.
  const methodEnabled = (type: string) =>
    mfaConfig?.methods?.some((m) => m.type === type && m.enabled) ?? false;
  const totpEnabled = methodEnabled("totp");
  const passkeyEnabled = methodEnabled("passkey");

  const sessionMfaEnabled = mfaConfig?.enabled ?? false;
  // `enrollment` is the current field ("none" | forced variants); `required`
  // is the legacy flag.
  const enrollment = mfaConfig?.enrollment;
  const mfaRequired =
    (mfaConfig?.required ?? false) ||
    (enrollment !== undefined && enrollment !== "none");
  const actionMfaEnabled = mfaConfig?.actions?.some((a) => a.required) ?? false;

  // MFA is live in the environment when session MFA is on OR some action is
  // protected; with neither, `registerTotpMfaDevice` throws "MFA is not
  // enabled for this environment" however the methods are configured. So
  // enrolling needs both: MFA live, and the method we register turned on.
  const isMfaEnabled = sessionMfaEnabled || actionMfaEnabled;
  const canEnrollMfa =
    isMfaEnabled && ENROLLABLE_MFA_METHODS.some(methodEnabled);

  return {
    sessionMfaEnabled,
    mfaRequired,
    actionMfaEnabled,
    totpEnabled,
    passkeyEnabled,
    isMfaEnabled,
    canEnrollMfa,
  };
}
