"use client";

/**
 * MFA Status Hook
 *
 * Centralized hook to determine MFA state for the current user:
 * - isMfaEnabled: Whether MFA is enabled in the environment
 * - isRequired: Whether MFA device setup is required at onboarding
 * - hasDevice: Whether the user has registered an MFA device
 * - needsSetup: Whether the user needs to set up MFA (required but no device)
 *
 * This hook checks the environment configuration via `getMfaSettings`
 * and the user's device status via `getMfaDevices`.
 */

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDemoMfa } from "@/contexts/demo-mfa-context";
import {
  getMfaDevices,
  getMfaSettings,
  getPasskeys,
  isMfaOnboardingPending,
  isPasskeySupported,
  isRecoveryCodesPending,
  isMfaRequiredForAction,
  MFAAction,
  type MfaMethod,
} from "@/lib/dynamic";

export interface UseMfaStatusResult {
  /** Whether session-based MFA (MFA at login) is enabled */
  sessionMfaEnabled: boolean;
  /** Whether the authenticator-app (TOTP) method is enabled */
  totpEnabled: boolean;
  /** Whether the passkey method is enabled */
  passkeyEnabled: boolean;
  /** Whether a method this app can actually enroll is enabled */
  canEnrollMfa: boolean;
  /** Whether MFA is enabled in the environment (session or action-based) */
  isMfaEnabled: boolean;
  /** Whether MFA device setup is required at onboarding */
  isRequired: boolean;
  /** Whether the user has any factor enrolled (authenticator or passkey) */
  hasDevice: boolean;
  /** Whether an authenticator app is registered */
  hasTotp: boolean;
  /** Whether a passkey is registered (doubles as the passkey MFA factor) */
  hasPasskey: boolean;
  /** Whether an MFA onboarding step is outstanding, blocking every WaaS call */
  onboardingPending: boolean;
  /** Whether recovery codes are issued but unacknowledged */
  recoveryCodesPending: boolean;
  /** Whether user needs to set up MFA (enabled and required but no device) */
  needsSetup: boolean;
  /** Whether MFA will be required for transactions (enabled and device is set up) */
  requiresMfa: boolean;
  /** Whether the status check is in progress */
  isLoading: boolean;
  /** Error if the check failed */
  error: Error | null;
  /** Refetch the MFA status */
  refetch: () => void;
}

/**
 * Check MFA requirement and device status for the current user
 *
 * @returns MFA status including whether setup is needed
 */
export function useMfaStatus(): UseMfaStatusResult {
  const query = useQuery({
    queryKey: ["mfa-status"],
    queryFn: async () => {
      // Get MFA settings from environment configuration
      const settings = getMfaSettings();
      const isMfaEnabled = settings?.isMfaEnabled ?? false;
      const mfaRequired = settings?.mfaRequired ?? false;
      const sessionMfaEnabled = settings?.sessionMfaEnabled ?? false;
      const totpEnabled = settings?.totpEnabled ?? false;
      const passkeyEnabled = settings?.passkeyEnabled ?? false;
      const canEnrollMfa = settings?.canEnrollMfa ?? false;

      // Enrolled factors. Passkeys are NOT MFA devices in Dynamic - there is
      // no passkey MFA-device registry, so `getMfaDevices()` never lists one
      // and a passkey-only user would read as unenrolled and be sent round
      // the enrollment loop forever.
      const [devices, passkeys] = await Promise.all([
        getMfaDevices().catch(() => []),
        getPasskeys().catch(() => []),
      ]);
      const hasTotp = devices.length > 0;
      const hasPasskey = passkeys.length > 0;
      const hasDevice = hasTotp || hasPasskey;

      // User needs setup if MFA is enabled (session OR action-based) AND no device exists
      // This catches both onboarding-required MFA and action-based MFA
      const needsSetup = isMfaEnabled && !hasDevice;

      // MFA will be required for transactions if enabled and device is set up
      const requiresMfa = isMfaEnabled && hasDevice;

      return {
        isMfaEnabled,
        sessionMfaEnabled,
        totpEnabled,
        passkeyEnabled,
        canEnrollMfa,
        isRequired: mfaRequired,
        hasDevice,
        hasTotp,
        hasPasskey,
        onboardingPending: isMfaOnboardingPending(),
        recoveryCodesPending: isRecoveryCodesPending(),
        needsSetup,
        requiresMfa,
      };
    },
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  return {
    isMfaEnabled: query.data?.isMfaEnabled ?? false,
    sessionMfaEnabled: query.data?.sessionMfaEnabled ?? false,
    totpEnabled: query.data?.totpEnabled ?? false,
    passkeyEnabled: query.data?.passkeyEnabled ?? false,
    canEnrollMfa: query.data?.canEnrollMfa ?? false,
    isRequired: query.data?.isRequired ?? false,
    hasDevice: query.data?.hasDevice ?? false,
    hasTotp: query.data?.hasTotp ?? false,
    hasPasskey: query.data?.hasPasskey ?? false,
    onboardingPending: query.data?.onboardingPending ?? false,
    recoveryCodesPending: query.data?.recoveryCodesPending ?? false,
    needsSetup: query.data?.needsSetup ?? false,
    requiresMfa: query.data?.requiresMfa ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Whether one Protected Action requires a step-up. This is the per-action
 * truth, and the same predicate the SDK's WaaS operations run before
 * consuming a token - so a flow should prompt for a code exactly when its
 * own action says true. Enabling an unrelated action does NOT flip it on.
 */
function useActionMfaRequired(mfaAction: MFAAction): {
  required: boolean;
  isLoading: boolean;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ["mfa-required-action", mfaAction],
    queryFn: async () => {
      try {
        return await isMfaRequiredForAction({ mfaAction });
      } catch {
        return false;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    required: query.data ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/** Step-up gate for signing, transactions, and EIP-7702 authorization. */
export function useSignMfaRequired(): {
  requiresSignMfa: boolean;
  isLoading: boolean;
  refetch: () => void;
} {
  const { required, isLoading, refetch } = useActionMfaRequired(
    MFAAction.WalletWaasSign,
  );
  return { requiresSignMfa: required, isLoading, refetch };
}

/**
 * Drop every MFA-derived cache. Enrolling changes more than the device list:
 * `isMfaRequiredForAction` falls through to `userHasVerifiedMfaMethods`, so a
 * first factor can flip an action from not-required to required, and the
 * 60s cache would otherwise hide that. Call after enrolling or removing one.
 */
export function useInvalidateMfaCaches(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["mfa-status"] }),
      queryClient.invalidateQueries({ queryKey: ["mfa-required-action"] }),
      queryClient.invalidateQueries({ queryKey: ["security-factors"] }),
    ]);
  }, [queryClient]);
}

/**
 * Which factor a step-up presents. Passkey always wins when one is enrolled -
 * a tap beats typing six digits - falling back to TOTP only where WebAuthn
 * isn't available at all. Dynamic has no say here: it has no default-factor
 * concept spanning both, since passkeys and MFA devices are separate
 * registries, and it consumes whichever token it's handed.
 */
function preferredMethod(hasPasskey: boolean): MfaMethod {
  return hasPasskey && isPasskeySupported() ? "passkey" : "totp";
}

/**
 * The chosen factor, plus an escape hatch. A passkey is bound to the device
 * that made it, so someone who enrolled on their laptop and opened the demo
 * on a phone gets a prompt that cannot succeed - `hasPasskey` is a
 * server-side fact and says nothing about *this* device. Offer the code
 * instead whenever TOTP is also enrolled.
 */
function useStepUpMethod(hasPasskey: boolean, hasTotp: boolean) {
  const [override, setOverride] = useState<MfaMethod | null>(null);
  const method = override ?? preferredMethod(hasPasskey);
  return {
    method,
    canUseTotpInstead: method === "passkey" && hasTotp,
    switchToTotp: useCallback(() => setOverride("totp"), []),
  };
}

/**
 * The preferred factor for a protected operation that isn't one of the
 * gated actions - removing a credential, say. Same preference the step-up
 * gates use, so every prompt in the app agrees on which factor to ask for.
 */
export function usePreferredFactor(): {
  method: MfaMethod;
  canUseTotpInstead: boolean;
  switchToTotp: () => void;
} {
  const { hasPasskey, hasTotp } = useMfaStatus();
  return useStepUpMethod(hasPasskey, hasTotp);
}

/** What a surface needs to know before running a protected operation. */
export interface StepUpGate {
  required: boolean;
  hasDevice: boolean;
  /** Nothing enrolled (or onboarding outstanding) - enrollment is the only offer. */
  needsEnrollment: boolean;
  /** A factor must be presented before the operation. */
  requiresStepUp: boolean;
  /** Which factor to present; `null` when no step-up is needed. */
  stepUpMethod: MfaMethod | null;
  /** True when a passkey is being asked for but a code would also work. */
  canUseTotpInstead: boolean;
  /** Switch this step-up to the authenticator code. */
  switchToTotp: () => void;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * The signing step-up gate, composed once so every surface agrees.
 *
 * Required when the environment says so (the WalletWaasSign protected action,
 * session-based MFA, or forced enrollment) or when the demo toggle treats
 * signing as protected. With no device registered the only valid next step is
 * enrollment - never a code prompt.
 */
export function useSignStepUp(): StepUpGate {
  const {
    hasDevice,
    hasPasskey,
    hasTotp,
    onboardingPending,
    sessionMfaEnabled,
    canEnrollMfa,
    isLoading: statusLoading,
    refetch,
  } = useMfaStatus();
  const { method, canUseTotpInstead, switchToTotp } = useStepUpMethod(
    hasPasskey,
    hasTotp,
  );
  const { requiresSignMfa: actionRequired, isLoading: actionLoading } =
    useSignMfaRequired();
  const { requireSignMfa } = useDemoMfa();

  // Enrollment policy is deliberately absent: `enrollment: "action"` means
  // "enroll on first protected action", which the per-action check already
  // covers - it must not force a step-up on signing when only an unrelated
  // action (e.g. Wallet Export) is protected.
  const required =
    actionRequired || sessionMfaEnabled || (requireSignMfa && canEnrollMfa);

  // `onboardingPending` stands alone: the backend is withholding
  // `user:basic`, so signing throws regardless of what this gate would
  // otherwise say - including when signing itself isn't protected.
  const needsEnrollment = onboardingPending || (required && !hasDevice);
  const requiresStepUp = !onboardingPending && required && hasDevice;

  return {
    required,
    hasDevice,
    needsEnrollment,
    requiresStepUp,
    stepUpMethod: requiresStepUp ? method : null,
    canUseTotpInstead: requiresStepUp && canUseTotpInstead,
    switchToTotp,
    isLoading: statusLoading || actionLoading,
    refetch,
  };
}

/**
 * The export step-up gate: revealing a private key runs the SDK's
 * exportPrivateKey, which consumes a single-use token whenever
 * WalletWaasExport is a protected action - without one it throws "No MFA
 * token found". Deliberately no demo toggle and no session-MFA fallback:
 * the SDK consults this one action, so anything else we OR in would put
 * up a prompt for a token nothing will consume.
 */
export function useExportStepUp(): StepUpGate {
  const {
    hasDevice,
    hasPasskey,
    hasTotp,
    onboardingPending,
    isLoading: statusLoading,
    refetch,
  } = useMfaStatus();
  const { method, canUseTotpInstead, switchToTotp } = useStepUpMethod(
    hasPasskey,
    hasTotp,
  );
  const { required, isLoading: actionLoading } = useActionMfaRequired(
    MFAAction.WalletWaasExport,
  );

  const needsEnrollment = onboardingPending || (required && !hasDevice);
  const requiresStepUp = !onboardingPending && required && hasDevice;

  return {
    required,
    hasDevice,
    needsEnrollment,
    requiresStepUp,
    stepUpMethod: requiresStepUp ? method : null,
    canUseTotpInstead: requiresStepUp && canUseTotpInstead,
    switchToTotp,
    isLoading: statusLoading || actionLoading,
    refetch,
  };
}

/**
 * Check if an error is MFA-related.
 *
 * Note: This is intentionally simple. For determining if MFA setup is needed,
 * use the `needsSetup` value from `useMfaStatus()` which proactively checks
 * device status rather than relying on error message parsing.
 *
 * @deprecated Prefer proactive checking via useMfaStatus().needsSetup
 */
export function isMfaRequiredError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // Only check for generic MFA-related errors
  // The proactive needsSetup check should handle setup requirements
  return (
    errorMessage.includes("mfa") && errorMessage.includes("device required")
  );
}
