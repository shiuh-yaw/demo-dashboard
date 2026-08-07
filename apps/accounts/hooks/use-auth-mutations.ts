"use client";

/**
 * Sign-in mutations. Kept separate from `use-business-accounts` so the auth
 * story and the accounts story are each readable on their own.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import {
  authenticateWithSocial,
  completeSocialAuthentication,
  detectOAuthRedirect,
  logout,
  sendEmailOTP,
  verifyOTP,
  type OTPVerification,
} from "@/lib/dynamic";

/** Refresh everything that depends on who is signed in. */
function useInvalidateSession() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["business-accounts"] });
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes("useGetWalletAccounts"),
    });
  };
}

export function useSendEmailOTP() {
  return useMutation({
    mutationFn: (email: string) => sendEmailOTP({ email }),
  });
}

export function useVerifyOTP() {
  const invalidate = useInvalidateSession();

  return useMutation({
    mutationFn: ({
      otpVerification,
      otp,
    }: {
      otpVerification: OTPVerification;
      otp: string;
    }) => verifyOTP({ otpVerification, verificationToken: otp }),
    onSuccess: invalidate,
  });
}

export function useSocialAuth() {
  return useMutation({
    mutationFn: (provider: SocialProvider) =>
      authenticateWithSocial({
        provider,
        redirectUrl: window.location.href,
      }),
  });
}

/**
 * Query params the social redirect leaves behind, cleared once consumed.
 * Named rather than wildcarded so a prospect's `?theme=` / `?share=` survive.
 */
const OAUTH_URL_PARAMS = [
  "dynamicOauthCode",
  "dynamicOauthState",
  "code",
  "state",
] as const;

/** Call on mount; resolves true when an OAuth return was detected. */
export function useCompleteSocialAuth() {
  const invalidate = useInvalidateSession();

  return useMutation({
    mutationFn: async () => {
      const url = new URL(window.location.href);
      const isReturning = await detectOAuthRedirect({ url });
      if (!isReturning) return false;
      await completeSocialAuthentication({ url });
      // The code is single-use and spent by the line above, so leaving it in
      // the address bar only invites a reload that tries to redeem it again -
      // and puts a credential-shaped string in history, bookmarks and any
      // screenshot of the demo. `replaceState` so Back does not return to it.
      const cleaned = new URL(window.location.href);
      const removedAny = OAUTH_URL_PARAMS.filter((key) =>
        cleaned.searchParams.has(key),
      );
      for (const key of removedAny) cleaned.searchParams.delete(key);
      if (removedAny.length > 0) {
        window.history.replaceState(
          {},
          "",
          `${cleaned.pathname}${cleaned.search}${cleaned.hash}`,
        );
      }
      return true;
    },
    onSuccess: invalidate,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.clear(),
  });
}
