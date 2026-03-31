"use client";

import { useCallback } from "react";
import type { DynamicAuthAdapter } from "./types";

/**
 * Hook that adapts DynamicAuthAdapter to LoginForm props.
 */
export function useAuthForm(adapter: DynamicAuthAdapter) {
  const onSendEmailOTP = useCallback(
    async (email: string) => {
      return adapter.onSendEmailOTP(email);
    },
    [adapter],
  );

  const onSocialSignIn = useCallback(
    async (provider: string) => {
      await adapter.onSocialSignIn(provider);
    },
    [adapter],
  );

  const onHandleOAuthRedirect = useCallback(async () => {
    return adapter.onHandleOAuthRedirect();
  }, [adapter]);

  const onJwtAuth = useCallback(
    async (jwt: string) => {
      await adapter.onJwtAuth(jwt);
    },
    [adapter],
  );

  return {
    emailEnabled: adapter.emailEnabled,
    socialProviders: adapter.socialProviders,
    jwtEnabled: adapter.jwtEnabled,
    onSendEmailOTP,
    onSocialSignIn,
    onHandleOAuthRedirect,
    onJwtAuth,
    isSendingOTP: adapter.isSendingOTP,
    sendOTPError: adapter.sendOTPError,
    socialAuthError: adapter.socialAuthError,
    isJwtPending: adapter.isJwtPending,
    jwtError: adapter.jwtError,
  };
}
