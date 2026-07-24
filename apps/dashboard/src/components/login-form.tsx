"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm, Spinner, WidgetCard } from "@dynamic-demos/ui";
import {
  getJWTToken,
  sendEmailOTP,
  signInWithGoogle,
  type OTPVerification,
} from "@/lib/dynamicClient";
import { setDynamicJWT } from "@/lib/auth/session";
import { useCompleteSocialAuth } from "@/hooks/use-complete-social-auth";
import { OTPConfirmationView } from "./auth/OTPConfirmationView";

/**
 * Dashboard Login Form
 *
 * Google OAuth + Email OTP authentication using Dynamic SDK, standardized on
 * the shared `LoginForm` (@dynamic-demos/ui) - the same component every demo
 * app (e.g. apps/wallet/components/screens/auth-screen.tsx) uses to drive
 * Dynamic auth. The shared component only sends the email code; OTP entry is
 * a separate step the app owns (same split wallet uses between its
 * auth-screen and otp-verify-screen), reusing this app's existing
 * `OTPConfirmationView`.
 *
 * OAuth redirect completion stays on `useCompleteSocialAuth` (unchanged) -
 * it already owns the cookie sync (`setDynamicJWT`) + `router.refresh()`
 * dance for this app's server-checked session, so it is driven directly
 * here instead of through `LoginForm`'s own `onHandleOAuthRedirect` prop.
 */
export default function DashboardLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpVerification, setOtpVerification] =
    useState<OTPVerification | null>(null);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [sendOTPError, setSendOTPError] = useState<unknown>(null);
  const [socialAuthError, setSocialAuthError] = useState<unknown>(null);

  // Handle OAuth redirects (Google sign-in completion)
  const { isLoading: isOAuthLoading, error: oAuthError } =
    useCompleteSocialAuth({
      onSuccess: () => {
        router.refresh();
      },
    });

  const handleSendEmailOTP = useCallback(async (emailInput: string) => {
    setIsSendingOTP(true);
    setSendOTPError(null);
    try {
      const verification = await sendEmailOTP({ email: emailInput });
      setEmail(emailInput);
      setOtpVerification(verification);
    } catch (error) {
      setSendOTPError(error);
    } finally {
      setIsSendingOTP(false);
    }
  }, []);

  const handleSocialSignIn = useCallback(async () => {
    setSocialAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Silently handle errors - user will see login page again
      console.error("Google sign-in failed:", error);
      setSocialAuthError(error);
    }
  }, []);

  /**
   * Handles OTP resend - creates a new verification object
   */
  async function handleResendOtp() {
    try {
      const newVerification = await sendEmailOTP({ email });
      setOtpVerification(newVerification);
      return newVerification;
    } catch (error) {
      console.error("Failed to resend OTP:", error);
      throw error;
    }
  }

  /**
   * Handles cancellation of OTP verification, returning to email input
   */
  function handleCancel() {
    setOtpVerification(null);
    setEmail("");
  }

  /**
   * Handles successful OTP verification
   * Retrieves JWT token and sets it in a cookie for server-side authentication
   */
  async function handleOtpSuccess() {
    try {
      const jwt = getJWTToken();
      if (!jwt) {
        throw new Error("Authentication succeeded but no token available");
      }

      const result = await setDynamicJWT(jwt);
      if (!result.success) {
        console.error("Failed to set auth cookie:", result.error);
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to complete authentication:", err);
      router.refresh();
    }
  }

  // Show loading state during OAuth completion - same footprint as the form
  // card below so it doesn't render as a tiny box.
  if (isOAuthLoading) {
    return (
      <WidgetCard className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 px-6 py-14">
          <Spinner size="lg" />
          <p className="text-sm text-[var(--widget-muted,#9a9a9a)]">
            Completing sign in...
          </p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard className="w-full max-w-sm">
      <div className="p-4">
        {otpVerification ? (
          <OTPConfirmationView
            email={email}
            otpVerification={otpVerification}
            onCancel={handleCancel}
            onSuccess={handleOtpSuccess}
            onResend={handleResendOtp}
          />
        ) : (
          <>
            {oAuthError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
                {oAuthError.message}
              </div>
            )}
            <LoginForm
              emailEnabled
              onSendEmailOTP={handleSendEmailOTP}
              isSendingOTP={isSendingOTP}
              sendOTPError={sendOTPError}
              socialProviders={["google"]}
              onSocialSignIn={handleSocialSignIn}
              socialAuthError={socialAuthError}
            />
          </>
        )}
      </div>
    </WidgetCard>
  );
}
