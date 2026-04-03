"use client";

/**
 * Authentication screen — uses shared LoginForm from packages/ui.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/email
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/social
 * @see https://www.dynamic.xyz/docs/javascript/external-auth/third-party-auth-usage
 */

import { useCallback } from "react";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import { WidgetCard, LoginForm } from "@dynamic-demos/ui";
import {
  isEmailAuthEnabled,
  getEnabledSocialProviders,
} from "@/lib/dynamic";
import {
  useSendEmailOTP,
  useSocialAuth,
  useCompleteSocialAuth,
  useJwtAuth,
} from "@/hooks/use-mutations";
import type { OTPVerification } from "@/lib/dynamic";

interface AuthScreenProps {
  navigation: {
    goToOtpVerify: (email: string, otpVerification: OTPVerification) => void;
  };
  onLoginSuccess?: () => void;
}

export function AuthScreen({ navigation, onLoginSuccess }: AuthScreenProps) {
  const sendOTP = useSendEmailOTP();
  const socialAuth = useSocialAuth();
  const completeSocial = useCompleteSocialAuth();
  const jwtAuth = useJwtAuth();

  const handleSendEmailOTP = useCallback(
    async (email: string) => {
      const otpVerification = await sendOTP.mutateAsync(email);
      navigation.goToOtpVerify(email, otpVerification);
    },
    [sendOTP, navigation],
  );

  const handleSocialSignIn = useCallback(
    async (provider: string) => {
      await socialAuth.mutateAsync(provider as SocialProvider);
    },
    [socialAuth],
  );

  const handleOAuthRedirect = useCallback(async () => {
    const result = await completeSocial.mutateAsync();
    if (result) onLoginSuccess?.();
    return result ?? false;
  }, [completeSocial, onLoginSuccess]);

  const handleJwtAuth = useCallback(
    async (jwt: string) => {
      await jwtAuth.mutateAsync(jwt);
      onLoginSuccess?.();
    },
    [jwtAuth, onLoginSuccess],
  );

  return (
    <WidgetCard>
      <div className="p-4">
        <LoginForm
          emailEnabled={isEmailAuthEnabled()}
          onSendEmailOTP={handleSendEmailOTP}
          isSendingOTP={sendOTP.isPending}
          sendOTPError={sendOTP.error}
          socialProviders={getEnabledSocialProviders()}
          onSocialSignIn={handleSocialSignIn}
          socialAuthError={socialAuth.error}
          onHandleOAuthRedirect={handleOAuthRedirect}
          jwtEnabled={false}
          onJwtAuth={handleJwtAuth}
          isJwtPending={jwtAuth.isPending}
          jwtError={jwtAuth.error}
        />
      </div>
    </WidgetCard>
  );
}
