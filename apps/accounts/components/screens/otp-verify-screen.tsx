"use client";

import { useState } from "react";
import { Button, Input, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { useVerifyOTP } from "@/hooks/use-auth-mutations";
import type { OTPVerification } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function OtpVerifyScreen({
  email,
  otpVerification,
  navigation,
}: {
  email: string;
  otpVerification: OTPVerification;
  navigation: NavigationReturn;
}) {
  const [otp, setOtp] = useState("");
  const verifyOTP = useVerifyOTP();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otp.trim()) return;
    try {
      await verifyOTP.mutateAsync({ otpVerification, otp: otp.trim() });
      // On success `useNavigation` redirects; `authenticated` fires from
      // <IdentityBridge />, which covers every auth method.
    } catch {
      // Rendered below from the mutation's error.
    }
  };

  return (
    <WidgetCard
      title="Verify your email"
      subtitle={`Enter the code sent to ${email}`}
      onBack={navigation.goToAuth}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Verification code"
          noAutofill
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="6-digit code"
          maxLength={6}
          inputMode="numeric"
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

        <p className="text-center text-xs text-(--brand-muted)">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={navigation.goToAuth}
            className="cursor-pointer text-(--brand-accent) hover:underline"
          >
            Try again
          </button>
        </p>
      </form>
    </WidgetCard>
  );
}
