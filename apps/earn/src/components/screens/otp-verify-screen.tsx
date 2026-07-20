"use client";

/**
 * Email OTP verification screen — shown after `<AuthScreen>` sends the
 * OTP. Reads the verification token, submits it, syncs the resulting
 * Dynamic JWT to the cookie, and invokes `onLoginSuccess` (parent
 * redirects to the app).
 */

import { useState } from "react";
import { useVerifyOTP } from "@/hooks/use-mutations";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import type { OTPVerification } from "@/lib/dynamic-auth";

interface OtpVerifyScreenProps {
  email: string;
  otpVerification: OTPVerification;
  onBack: () => void;
  onLoginSuccess: () => void;
}

export function OtpVerifyScreen({
  email,
  otpVerification,
  onBack,
  onLoginSuccess,
}: OtpVerifyScreenProps) {
  // Swap the scenario page's code panel to the OTP steps while this
  // screen is up (Q-017). No-op on /login, where no provider exists.
  usePanelSectionEffect("otp-verify");
  const [otp, setOtp] = useState("");
  const verifyOTP = useVerifyOTP();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    try {
      await verifyOTP.mutateAsync({ otpVerification, otp });
      onLoginSuccess();
    } catch {
      // surfaced below
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-(--brand-fg)">
          Verify email
        </h2>
        <p className="text-sm text-(--brand-muted) mt-1">
          Enter the code sent to {email}
        </p>
      </div>

      <input
        type="text"
        inputMode="numeric"
        autoFocus
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="6-digit code"
        disabled={verifyOTP.isPending}
        className="w-full px-3 py-2.5 rounded-lg border border-(--brand-border) bg-(--brand-surface) text-(--brand-fg) placeholder:text-(--brand-muted) focus:outline-none focus:ring-1 focus:ring-(--brand-primary) focus:border-(--brand-primary) disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={!otp.trim() || verifyOTP.isPending}
        className="w-full h-10 rounded-lg bg-(--brand-primary) text-white font-medium hover:bg-(--brand-primary-hover) disabled:opacity-50 transition-colors"
      >
        {verifyOTP.isPending ? "Verifying…" : "Verify"}
      </button>

      {verifyOTP.error ? (
        <p className="text-sm text-(--brand-error)">
          {(verifyOTP.error as Error).message || "Verification failed"}
        </p>
      ) : null}

      <p className="text-xs text-center text-(--brand-muted)">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-(--brand-primary) hover:underline"
        >
          Try again
        </button>
      </p>
    </form>
  );
}
