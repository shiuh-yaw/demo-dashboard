"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { WidgetLayout } from "@/components/ui/widget-layout";
import { AuthScreen } from "@/components/screens/auth-screen";
import { OtpVerifyScreen } from "./otp-verify-screen";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import type { OTPVerification } from "@/lib/dynamic";
import { useVisaDirectConfig } from "@/contexts/visa-direct-config-context";
import { AppLogo } from "@/components/ui/app-logo";

/**
 * Login page: email OTP + Google SSO via Dynamic SDK.
 */
export function LoginPageClient() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/payment-methods";

  const [screen, setScreen] = useState<
    | { type: "auth" }
    | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  >({ type: "auth" });

  const isClientReady = useClientInitialized();
  const { branding } = useVisaDirectConfig();

  const goToApp = useCallback(() => {
    const destination = returnTo || "/payment-methods";
    const path = destination.startsWith("/")
      ? destination
      : `/${destination}`;
    window.location.href = path;
  }, [returnTo]);

  const authNavigation = useMemo(
    () => ({
      goToOtpVerify: (email: string, otpVerification: OTPVerification) =>
        setScreen({ type: "otp-verify", email, otpVerification }),
    }),
    [],
  );

  const otpNavigation = useMemo(
    () => ({
      goToAuth: () => setScreen({ type: "auth" }),
    }),
    [],
  );

  return (
    <WidgetLayout>
      <div className="mb-6 flex flex-col items-center text-center">
        <AppLogo logoUrl={branding.logoUrl} size={40} className="mb-3" />
      </div>

      {!isClientReady ? (
        <WidgetCard>
          <div className="flex items-center justify-center min-h-64">
            <Spinner size="lg" />
          </div>
        </WidgetCard>
      ) : (
        <>
          {screen.type === "auth" && (
            <AuthScreen
              navigation={authNavigation}
              onLoginSuccess={goToApp}
            />
          )}
          {screen.type === "otp-verify" && (
            <OtpVerifyScreen
              email={screen.email}
              otpVerification={screen.otpVerification}
              navigation={otpNavigation}
              onLoginSuccess={goToApp}
            />
          )}
        </>
      )}
    </WidgetLayout>
  );
}
