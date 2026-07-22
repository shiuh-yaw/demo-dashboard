"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { OTPVerification } from "@/lib/dynamic";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { AuthScreen } from "@/components/screens/auth-screen";
import { OtpVerifyScreen } from "@/components/screens/otp-verify-screen";

interface LoginPageProps {
  /** Override returnTo - the front-door page passes returnTo from its searchParams here. */
  returnToOverride?: string;
}

/**
 * Login page: auth + OTP only. Redirect on success via callbacks.
 * Server layouts handle KYC gate when user lands on app routes.
 */
export function LoginPage({ returnToOverride }: LoginPageProps = {}) {
  const searchParams = useSearchParams();
  const returnTo = returnToOverride ?? searchParams.get("returnTo") ?? "/";

  const [screen, setScreen] = useState<
    | { type: "auth" }
    | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  >({ type: "auth" });

  const isClientReady = useClientInitialized();

  const goToApp = useCallback(() => {
    const destination = returnTo || "/";
    const path = destination.startsWith("/") ? destination : `/${destination}`;
    window.location.href = path;
  }, [returnTo]);

  const goToOtpVerify = useCallback(
    (email: string, otpVerification: OTPVerification) => {
      setScreen({ type: "otp-verify", email, otpVerification });
    },
    [],
  );

  const goToAuth = useCallback(() => setScreen({ type: "auth" }), []);

  if (!isClientReady) {
    return (
      <WidgetCard>
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <div>
      {screen.type === "auth" && (
        <AuthScreen navigation={{ goToOtpVerify }} onLoginSuccess={goToApp} />
      )}
      {screen.type === "otp-verify" && (
        <OtpVerifyScreen
          email={screen.email}
          otpVerification={screen.otpVerification}
          navigation={{ goToAuth }}
          onLoginSuccess={goToApp}
        />
      )}
    </div>
  );
}
