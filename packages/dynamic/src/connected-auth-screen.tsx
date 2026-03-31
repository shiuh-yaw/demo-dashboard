"use client";

import { useMemo } from "react";
import { WidgetCard, LoginForm } from "@dynamic-demos/ui";
import { useAuthForm } from "./use-auth-form";
import type { ConnectedAuthScreenProps } from "./types";

/**
 * Auth screen with Dynamic SDK logic baked in.
 * Pass an adapter (app's lib/dynamic + completeOAuthRedirect) and navigation.
 */
export function ConnectedAuthScreen({
  adapter,
  title = "Sign In",
  subtitle = "Choose how to authenticate",
  onOtpVerify,
  onLoginSuccess,
}: ConnectedAuthScreenProps) {
  const formProps = useAuthForm(adapter);

  const handlers = useMemo(
    () => ({
      ...formProps,
      onSendEmailOTP: async (email: string) => {
        const otpVerification = await formProps.onSendEmailOTP(email);
        onOtpVerify?.(email, otpVerification);
      },
      onSocialSignIn: formProps.onSocialSignIn,
      onHandleOAuthRedirect: async () => {
        const result = await formProps.onHandleOAuthRedirect();
        if (result) onLoginSuccess?.();
        return result;
      },
      onJwtAuth: async (jwt: string) => {
        await formProps.onJwtAuth(jwt);
        onLoginSuccess?.();
      },
    }),
    [formProps, onOtpVerify, onLoginSuccess],
  );

  return (
    <WidgetCard>
      <div className="p-4">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h2 className="text-lg font-semibold text-(--widget-fg)">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-(--widget-muted) mt-1">{subtitle}</p>
            )}
          </div>
        )}
        <LoginForm
          emailEnabled={handlers.emailEnabled}
          onSendEmailOTP={handlers.onSendEmailOTP}
          isSendingOTP={handlers.isSendingOTP}
          sendOTPError={handlers.sendOTPError}
          socialProviders={handlers.socialProviders}
          onSocialSignIn={handlers.onSocialSignIn}
          socialAuthError={handlers.socialAuthError}
          onHandleOAuthRedirect={handlers.onHandleOAuthRedirect}
          jwtEnabled={handlers.jwtEnabled}
          onJwtAuth={handlers.onJwtAuth}
          isJwtPending={handlers.isJwtPending}
          jwtError={handlers.jwtError}
        />
      </div>
    </WidgetCard>
  );
}
