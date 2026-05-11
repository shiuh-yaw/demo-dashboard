"use client";

import { useState } from "react";
import { WidgetCard, Button, Input } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/ui/error-message";
import { useVerifyOTP } from "@/hooks/use-mutations";
import type { OTPVerification } from "@/lib/dynamic";

interface NavigationReturn {
  goToAuth: () => void;
}

interface OtpVerifyScreenProps {
  email: string;
  otpVerification: OTPVerification;
  navigation: NavigationReturn;
  onLoginSuccess?: () => void;
}

/**
 * OTP verification screen.
 * Mirrors trade's OtpVerifyScreen shape (navigation.goToAuth) for consistency.
 */
export function OtpVerifyScreen({
  email,
  otpVerification,
  navigation,
  onLoginSuccess,
}: OtpVerifyScreenProps) {
  const [otp, setOtp] = useState("");
  const verifyOTP = useVerifyOTP();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    try {
      await verifyOTP.mutateAsync({ otpVerification, otp });
      onLoginSuccess?.();
    } catch {
      // Error surfaced via verifyOTP.error below.
    }
  };

  return (
    <WidgetCard
      title="Verify email"
      subtitle={`Enter the code sent to ${email}`}
      onBack={navigation.goToAuth}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Verification code"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
          autoFocus
          disabled={verifyOTP.isPending}
        />

        <Button
          type="submit"
          className="w-full"
          loading={verifyOTP.isPending}
          disabled={!otp.trim()}
        >
          Verify
        </Button>

        <ErrorMessage error={verifyOTP.error} />

        <p className="text-xs text-center text-(--brand-muted)">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={navigation.goToAuth}
            className="text-(--brand-accent) hover:underline"
          >
            Try again
          </button>
        </p>
      </form>
    </WidgetCard>
  );
}
