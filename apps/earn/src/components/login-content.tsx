"use client";

/**
 * Login Content Component
 *
 * Screen state machine for the unified login surface (D-008 parity
 * with wallet / remittance / checkouts). Two screens:
 *
 *   - `auth`        : renders `<AuthScreen>` (LoginForm with email +
 *                     social + JWT enabled by capability check).
 *   - `otp-verify`  : renders `<OtpVerifyScreen>` after the email OTP
 *                     send returns an `OTPVerification` token.
 *
 * OAuth completion stays on the existing `useCompleteSocialAuth` effect
 * hook — it runs on mount, detects redirect params, syncs the cookie,
 * and fires `onSuccess`. LoginForm's `onHandleOAuthRedirect` prop is
 * intentionally NOT passed (double-handling would race).
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCompleteSocialAuth } from "@/hooks/use-complete-social-auth";
import { AuthScreen } from "@/components/screens/auth-screen";
import { OtpVerifyScreen } from "@/components/screens/otp-verify-screen";
import type { OTPVerification } from "@/lib/dynamic-auth";

interface LoginContentProps {
  /** Server-detected OAuth callback - show spinner immediately */
  isOAuthCallback?: boolean;
  /** Custom redirect URL after login (default: /earn) */
  redirectTo?: string;
}

type Screen =
  | { type: "auth" }
  | { type: "otp-verify"; email: string; otpVerification: OTPVerification };

export function LoginContent({
  isOAuthCallback = false,
  redirectTo = "/earn",
}: LoginContentProps) {
  const [screen, setScreen] = useState<Screen>({ type: "auth" });

  const goToApp = () => {
    // Full page load so the server sees the freshly-synced cookie.
    window.location.href = redirectTo;
  };

  const { isLoading, error } = useCompleteSocialAuth({
    onSuccess: goToApp,
    onError: (e) => console.error("OAuth error:", e),
  });

  if (!error && (isOAuthCallback || isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-(--brand-primary)" />
        <p className="text-base text-(--brand-muted)">Completing sign in...</p>
      </div>
    );
  }

  if (screen.type === "otp-verify") {
    return (
      <OtpVerifyScreen
        email={screen.email}
        otpVerification={screen.otpVerification}
        onBack={() => setScreen({ type: "auth" })}
        onLoginSuccess={goToApp}
      />
    );
  }

  return (
    <AuthScreen
      onOtpVerify={(email, otpVerification) =>
        setScreen({ type: "otp-verify", email, otpVerification })
      }
      onLoginSuccess={goToApp}
    />
  );
}
