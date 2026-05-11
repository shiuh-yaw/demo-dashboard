"use client";

/**
 * Auth screen — wraps `LoginForm` from `@dynamic-demos/ui` and wires it
 * to earn's auth mutations + capability checks. Mirrors
 * `apps/remittance/components/screens/auth-screen.tsx`.
 *
 * `onHandleOAuthRedirect` is intentionally NOT passed here — the page
 * uses the existing `useCompleteSocialAuth` effect hook to detect +
 * complete OAuth redirects on mount. LoginForm would double-handle.
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import { LoginForm } from "@dynamic-demos/ui";
import {
  isEmailAuthEnabled,
  getEnabledSocialProviders,
  isExternalAuthEnabled,
  type OTPVerification,
} from "@/lib/dynamic-auth";
import {
  useSendEmailOTP,
  useSocialAuth,
  useJwtAuth,
} from "@/hooks/use-mutations";
import { initializeDynamic, waitForClientInitialized } from "@/lib/dynamic";

interface AuthScreenProps {
  onOtpVerify: (email: string, otpVerification: OTPVerification) => void;
  onLoginSuccess: () => void;
}

export function AuthScreen({ onOtpVerify, onLoginSuccess }: AuthScreenProps) {
  // Capability checks read `client.projectSettings`, which the SDK
  // populates async during init. We can't rely on a "initStatusChanged"
  // event because the SDK may transition to `initialized` before our
  // effect subscribes — easier to await `waitForClientInitialized`
  // directly and flip a local boolean when ready.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeDynamic();
        await waitForClientInitialized();
      } catch {
        // If init fails outright, still render the form (it'll surface
        // the error from the first auth call).
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendOTP = useSendEmailOTP();
  const socialAuth = useSocialAuth();
  const jwtAuth = useJwtAuth();

  const handleSendEmailOTP = async (email: string) => {
    const otpVerification = await sendOTP.mutateAsync(email);
    onOtpVerify(email, otpVerification);
  };

  const handleSocialSignIn = async (provider: string) => {
    await socialAuth.mutateAsync(provider as SocialProvider);
  };

  const handleJwtAuth = async (jwt: string) => {
    await jwtAuth.mutateAsync(jwt);
    onLoginSuccess();
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-(--brand-primary)" />
      </div>
    );
  }

  return (
    <LoginForm
      emailEnabled={isEmailAuthEnabled()}
      onSendEmailOTP={handleSendEmailOTP}
      isSendingOTP={sendOTP.isPending}
      sendOTPError={sendOTP.error}
      socialProviders={getEnabledSocialProviders()}
      onSocialSignIn={handleSocialSignIn}
      socialAuthError={socialAuth.error}
      jwtEnabled={isExternalAuthEnabled()}
      onJwtAuth={handleJwtAuth}
      isJwtPending={jwtAuth.isPending}
      jwtError={jwtAuth.error}
    />
  );
}
