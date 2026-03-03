"use client";

import { useCallback } from "react";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import { WidgetCard, LoginForm } from "@dynamic-demos/ui";
import {
  isEmailAuthEnabled,
  getEnabledSocialProviders,
  isExternalAuthEnabled,
} from "@/lib/dynamic";
import {
  useSendEmailOTP,
  useSocialAuth,
  useCompleteSocialAuth,
  useJwtAuth,
} from "@/hooks/use-mutations";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface AuthScreenProps {
  navigation: Pick<NavigationReturn, "goToOtpVerify">;
  onLoginSuccess?: () => void;
}

export function AuthScreen({ navigation, onLoginSuccess }: AuthScreenProps) {
  const sendOTP = useSendEmailOTP();
  const socialAuth = useSocialAuth();
  const completeSocial = useCompleteSocialAuth();
  const jwtAuth = useJwtAuth();

  const handleSendEmailOTP = async (email: string) => {
    const otpVerification = await sendOTP.mutateAsync(email);
    navigation.goToOtpVerify(email, otpVerification);
  };

  const handleSocialSignIn = async (provider: string) => {
    await socialAuth.mutateAsync(provider as SocialProvider);
  };

  const handleOAuthRedirect = useCallback(async () => {
    const result = await completeSocial.mutateAsync();
    if (result) onLoginSuccess?.();
    return result;
  }, [completeSocial, onLoginSuccess]);

  const handleJwtAuth = async (jwt: string) => {
    await jwtAuth.mutateAsync(jwt);
    onLoginSuccess?.();
  };

  return (
    <WidgetCard title="Send Money Globally" subtitle="Sign in to get started">
      <LoginForm
        emailEnabled={isEmailAuthEnabled()}
        onSendEmailOTP={handleSendEmailOTP}
        isSendingOTP={sendOTP.isPending}
        sendOTPError={sendOTP.error}
        socialProviders={getEnabledSocialProviders()}
        onSocialSignIn={handleSocialSignIn}
        socialAuthError={socialAuth.error}
        onHandleOAuthRedirect={handleOAuthRedirect}
        jwtEnabled={isExternalAuthEnabled()}
        onJwtAuth={handleJwtAuth}
        isJwtPending={jwtAuth.isPending}
        jwtError={jwtAuth.error}
      />
    </WidgetCard>
  );
}
