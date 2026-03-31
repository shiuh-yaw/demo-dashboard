"use client";

/**
 * Authentication screen — uses shared LoginForm with email, social, and JWT.
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
  navigation: NavigationReturn;
}

export function AuthScreen({ navigation }: AuthScreenProps) {
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
    return result ?? false;
  }, [completeSocial]);

  const handleJwtAuth = useCallback(
    async (jwt: string) => {
      await jwtAuth.mutateAsync(jwt);
    },
    [jwtAuth],
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
          jwtEnabled={isExternalAuthEnabled()}
          onJwtAuth={handleJwtAuth}
          isJwtPending={jwtAuth.isPending}
          jwtError={jwtAuth.error}
        />
      </div>
    </WidgetCard>
  );
}
