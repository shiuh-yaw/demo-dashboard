"use client";

/**
 * Setup MFA Screen
 *
 * Guides users through setting up TOTP (Time-based One-Time Password) MFA.
 * Shows a QR code that can be scanned with an authenticator app, plus
 * a fallback secret key for manual entry.
 *
 * Flow:
 * 1. Register new TOTP device -> get QR URI and secret
 * 2. Display QR code for user to scan
 * 3. User enters 6-digit code from authenticator app
 * 4. Verify code to complete setup
 * 5. Return to original flow (authorization or transaction)
 */

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Fingerprint, Shield } from "lucide-react";
import {
  WidgetCard,
  Button,
  LoadingCard,
  ErrorCard,
  CopyButton,
} from "@dynamic-demos/ui";
import { MfaCodeInput } from "@/components/ui/mfa-code-input";
import { ErrorMessage } from "@/components/error-message";
import {
  acknowledgeRecoveryCodes,
  registerTotpMfaDevice,
  authenticateTotpMfaDevice,
  getMfaDevices,
  getMfaRecoveryCodes,
  isPasskeySupported,
  isRecoveryCodesPending,
  registerPasskey,
} from "@/lib/dynamic";
import {
  useInvalidateMfaCaches,
  useMfaStatus,
} from "@/hooks/use-mfa-status";

type SetupStep =
  | "loading"
  | "choose"
  | "scan"
  | "verify"
  | "recovery-codes"
  | "error";

interface SetupMfaScreenProps {
  /** Called when MFA setup is complete */
  onSuccess: () => void;
  /** Called when user cancels setup */
  onCancel: () => void;
}

/**
 * MFA Setup screen with QR code and verification
 */
export function SetupMfaScreen({ onSuccess, onCancel }: SetupMfaScreenProps) {
  const [step, setStep] = useState<SetupStep>("loading");
  const [qrUri, setQrUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const startedRef = useRef(false);
  const {
    totpEnabled,
    passkeyEnabled,
    isLoading: statusLoading,
  } = useMfaStatus();
  const invalidateMfaCaches = useInvalidateMfaCaches();
  // Passkeys need WebAuthn; without it TOTP is the only route.
  const canUsePasskey = passkeyEnabled && isPasskeySupported();

  const shieldIcon = (
    <Shield
      className="w-[18px] h-[18px] text-(--brand-accent)"
      strokeWidth={1.5}
    />
  );

  // Back out of a factor to the picker when there was one; otherwise leave.
  const backFromFactor = () => {
    if (!canUsePasskey) return onCancel();
    setError(null);
    setCode("");
    setStep("choose");
  };

  const showRecoveryCodes = async () => {
    const { recoveryCodes: codes } = await getMfaRecoveryCodes();
    setRecoveryCodes(codes);
    setStep("recovery-codes");
  };

  const startTotp = async () => {
    setError(null);
    setStep("loading");
    try {
      const result = await registerTotpMfaDevice();
      setQrUri(result.uri);
      setSecret(result.secret);
      setStep("scan");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        new Error(
          message.includes("Multiple MFA devices")
            ? "You already have an authenticator set up. Please use your existing authenticator app."
            : message,
        ),
      );
      setStep("error");
    }
  };

  const startPasskey = async () => {
    setError(null);
    setIsVerifying(true);
    try {
      // Registering a passkey IS the passkey MFA enrollment - Dynamic has no
      // separate passkey MFA device.
      await registerPasskey({ createMfaToken: { singleUse: true } });
      if (isRecoveryCodesPending()) {
        await showRecoveryCodes();
        return;
      }
      await invalidateMfaCaches();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Could not register a passkey. Try again."),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Decide the entry step on mount
  useEffect(() => {
    if (statusLoading || startedRef.current) return;
    startedRef.current = true;
    const registerDevice = async () => {
      try {
        // Enrolled already but the codes were never acknowledged: onboarding
        // is still incomplete, so resume there rather than reporting a
        // duplicate device the user can do nothing about.
        if (isRecoveryCodesPending()) {
          await showRecoveryCodes();
          return;
        }

        // Check if user already has a device
        const existingDevices = await getMfaDevices();
        if (existingDevices.length > 0) {
          // User already has a device - shouldn't be on this screen
          setError(
            new Error(
              "You already have an authenticator set up. Please use your existing authenticator app to enter the code.",
            ),
          );
          setStep("error");
          return;
        }

        // Passkey is on the table - let the user pick rather than assuming.
        // TOTP-only falls through and registers immediately, as before.
        if (canUsePasskey) {
          setStep("choose");
          return;
        }

        const result = await registerTotpMfaDevice();
        setQrUri(result.uri);
        setSecret(result.secret);
        setStep("scan");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Provide a more helpful error message for "multiple devices" error
        if (errorMessage.includes("Multiple MFA devices")) {
          setError(
            new Error(
              "You already have an authenticator set up. Please use your existing authenticator app.",
            ),
          );
        } else {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to register MFA device"),
          );
        }
        setStep("error");
      }
    };
    registerDevice();
    // Runs once, but only after the MFA settings land - reading
    // `canUsePasskey` while it's still loading would silently skip the
    // picker and register TOTP every time. The ref keeps it to one run.
  }, [statusLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      // Verify the code and create a single-use MFA token
      await authenticateTotpMfaDevice({
        code,
        createMfaTokenOptions: { singleUse: true },
      });
      // Methods with backup codes leave onboarding incomplete until the
      // codes are acknowledged - every WaaS call throws until then, so
      // finish here rather than handing back a verified-but-locked wallet.
      if (isRecoveryCodesPending()) {
        await showRecoveryCodes();
        return;
      }
      // Refetch MFA status before navigating so destination screen has fresh data
      await invalidateMfaCaches();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Invalid code. Please try again."),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAcknowledgeCodes = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      await acknowledgeRecoveryCodes();
      await invalidateMfaCaches();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Could not save your acknowledgment. Try again."),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Factor picker - only when passkeys are a real option here
  if (step === "choose") {
    return (
      <WidgetCard
        title="Set Up 2FA"
        subtitle="Add a second factor to protect this wallet"
        onBack={onCancel}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={startPasskey}
            disabled={isVerifying}
            className="flex w-full items-center gap-3 rounded-(--brand-radius) border border-(--brand-border) p-3 text-left transition-colors hover:bg-(--brand-row-hover) disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
              <Fingerprint
                className="h-[18px] w-[18px] text-(--brand-accent)"
                strokeWidth={1.5}
              />
            </div>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-(--brand-fg)">
                Passkey
              </span>
              <span className="block text-xs leading-relaxed text-(--brand-muted)">
                Face ID, Touch ID, or a security key. Nothing to type.
              </span>
            </span>
          </button>

          {totpEnabled && (
            <button
              type="button"
              onClick={startTotp}
              disabled={isVerifying}
              className="flex w-full items-center gap-3 rounded-(--brand-radius) border border-(--brand-border) p-3 text-left transition-colors hover:bg-(--brand-row-hover) disabled:opacity-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
                {shieldIcon}
              </div>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-(--brand-fg)">
                  Authenticator app
                </span>
                <span className="block text-xs leading-relaxed text-(--brand-muted)">
                  A 6-digit code from Google Authenticator, Authy, or similar.
                </span>
              </span>
            </button>
          )}

          <ErrorMessage error={error} />
        </div>
      </WidgetCard>
    );
  }

  // Recovery codes - the last onboarding step, not an optional extra
  if (step === "recovery-codes") {
    return (
      <WidgetCard title="Save Your Recovery Codes" onBack={onCancel}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-(--brand-row-bg) rounded-(--brand-radius)">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
              {shieldIcon}
            </div>
            <p className="text-xs leading-relaxed text-(--brand-muted)">
              Each code signs you in once if you lose your authenticator.
              You won&apos;t see them again.
            </p>
          </div>

          <div className="p-3 bg-(--brand-row-bg) rounded-(--brand-radius)">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-(--brand-muted)">
                Recovery codes
              </p>
              <CopyButton
                text={recoveryCodes.join("\n")}
                label="Copy all"
                showTooltip
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recoveryCodes.map((recoveryCode) => (
                <code
                  key={recoveryCode}
                  className="rounded-md border border-(--brand-border) bg-(--brand-surface) px-2 py-1 text-center font-mono text-xs tracking-wide text-(--brand-fg)"
                >
                  {recoveryCode}
                </code>
              ))}
            </div>
          </div>

          <ErrorMessage error={error} />

          <Button
            className="w-full"
            loading={isVerifying}
            onClick={handleAcknowledgeCodes}
          >
            I&apos;ve saved these
          </Button>
        </div>
      </WidgetCard>
    );
  }

  // Loading state
  if (step === "loading") {
    return (
      <LoadingCard
        icon={shieldIcon}
        title="Set Up Authenticator"
        message="Preparing setup..."
        onBack={onCancel}
      />
    );
  }

  // Error state
  if (step === "error") {
    return (
      <ErrorCard
        icon={
          <Shield
            className="w-[18px] h-[18px] text-(--brand-error)"
            strokeWidth={1.5}
          />
        }
        title="Setup Error"
        error={error}
        onBack={onCancel}
      />
    );
  }

  // Main setup UI (scan + verify)
  return (
    <WidgetCard title="Set Up Authenticator" onBack={backFromFactor}>
      <form onSubmit={handleVerify} className="space-y-4">
        {/* Copy left, QR right. The shield stays on the screen even
            though the header slot now holds the back arrow. */}
        <div className="bg-(--brand-row-bg) rounded-(--brand-radius)">
        <div className="flex items-center gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
              {shieldIcon}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-(--brand-fg)">
                Scan the code
              </p>
              <p className="text-xs leading-relaxed text-(--brand-muted)">
                Add a new account in Google Authenticator, Authy, or a
                similar app.
              </p>
            </div>
          </div>
          <div className="shrink-0 bg-white p-2 rounded-lg">
            <QRCodeSVG
              value={qrUri}
              size={112}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Secret key fallback - collapsible, inside the scan box: it's
            the same step by another route, not a separate one. */}
        <details className="group border-t border-(--brand-border) px-3 py-2.5">
          <summary className="flex items-center justify-between cursor-pointer text-xs text-(--brand-muted) hover:text-(--brand-fg) transition-colors">
            <span>Can&apos;t scan? Enter key manually</span>
            <span className="text-[10px] group-open:hidden">Show</span>
            <span className="text-[10px] hidden group-open:inline">Hide</span>
          </summary>
          <div className="mt-2 px-2.5 py-1.5 bg-(--brand-surface) border border-(--brand-border) rounded-(--brand-radius)">
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-(--brand-fg) break-all flex-1">
                {secret}
              </code>
              <CopyButton
                text={secret}
                label="Copy secret"
                className="shrink-0"
              />
            </div>
          </div>
        </details>
        </div>

        {/* Verification code input */}
        <MfaCodeInput
          label="Enter 6-digit code"
          value={code}
          onChange={setCode}
          disabled={isVerifying}
          autoFocus
        />

        <ErrorMessage error={error} />

        {/* Back lives in the header arrow - one way out, not two. */}
        <Button
          type="submit"
          className="w-full"
          loading={isVerifying}
          disabled={code.length !== 6}
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </Button>
      </form>
    </WidgetCard>
  );
}
