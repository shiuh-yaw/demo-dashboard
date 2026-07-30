"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { OTPVerification } from "@/lib/dynamic";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { useAuth } from "@/hooks/use-auth";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { AuthScreen } from "@/components/screens/auth-screen";
import { OtpVerifyScreen } from "@/components/screens/otp-verify-screen";

interface LoginPageProps {
  /** Override returnTo (e.g. for /r/[id]/login when returnTo not in URL) */
  returnToOverride?: string;
}

/**
 * Login page: auth + OTP. Uses wallet app's AuthScreen and OtpVerifyScreen.
 * Redirects to returnTo when user is authenticated.
 */
export function LoginPage({ returnToOverride }: LoginPageProps = {}) {
  const searchParams = useSearchParams();
  const returnTo = returnToOverride ?? searchParams.get("returnTo") ?? "/";
  const isLoggedIn = useAuth();

  const [screen, setScreen] = useState<
    | { type: "auth" }
    | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  >({ type: "auth" });

  const isClientReady = useClientInitialized();

  // Redirect when authenticated
  useEffect(() => {
    if (!isClientReady || !isLoggedIn) return;
    const destination = returnTo || "/";
    const path = destination.startsWith("/") ? destination : `/${destination}`;
    window.location.href = path;
  }, [isClientReady, isLoggedIn, returnTo]);

  const goToOtpVerify = useCallback(
    (email: string, otpVerification: OTPVerification) => {
      setScreen({ type: "otp-verify", email, otpVerification });
    },
    [],
  );

  const goToAuth = useCallback(() => setScreen({ type: "auth" }), []);

  const goToApp = useCallback(() => {
    const destination = returnTo || "/";
    const path = destination.startsWith("/") ? destination : `/${destination}`;
    window.location.href = path;
  }, [returnTo]);

  // Spinner while the SDK boots AND while an authenticated session is
  // redirecting: rendering the auth screen during the logged-in window (as
  // window.location.href navigation resolves) is what flashed it repeatedly
  // on each Dynamic auth event.
  if (!isClientReady || isLoggedIn) {
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
