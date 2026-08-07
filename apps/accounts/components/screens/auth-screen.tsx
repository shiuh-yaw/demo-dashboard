"use client";

/**
 * Sign-in. Uses the shared `LoginForm` so the auth surface matches every other
 * demo; this app wires the SDK calls and hands them in as props.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/email
 */

import { useCallback } from "react";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import { LoginForm, WidgetCard } from "@dynamic-demos/ui";
import { getEnabledSocialProviders, isEmailAuthEnabled } from "@/lib/dynamic";
import {
  useCompleteSocialAuth,
  useSendEmailOTP,
  useSocialAuth,
} from "@/hooks/use-auth-mutations";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AuthScreen({
  navigation,
}: {
  navigation: NavigationReturn;
}) {
  const sendOTP = useSendEmailOTP();
  const socialAuth = useSocialAuth();
  const completeSocial = useCompleteSocialAuth();

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
        />
      </div>
    </WidgetCard>
  );
}
