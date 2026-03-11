"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type SocialProvider,
  MissingRedirectStorageStateError,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts,
  sendEmailOTP,
  verifyOTP,
  logout,
  authenticateWithSocial,
  completeSocialAuthentication,
  detectOAuthRedirect,
  signInWithExternalJwt,
  getAuthToken,
  isSignedIn,
  waitForClientInitialized,
  type OTPVerification,
  type Chain,
} from "@/lib/dynamic";
import { clearAuthCookie } from "@/lib/auth/session";
import { syncCookie } from "@/lib/auth/sync-cookie";
import {
  sendUsdcTransaction,
  type SendUsdcTransactionParams,
} from "@/lib/transactions/send-usdc-transaction";

// Auth mutations

export function useSendEmailOTP() {
  return useMutation({
    mutationFn: (email: string) => sendEmailOTP({ email }),
  });
}

export function useVerifyOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      otpVerification,
      otp,
    }: {
      otpVerification: OTPVerification;
      otp: string;
    }) =>
      verifyOTP({
        otpVerification,
        verificationToken: otp,
      }),
    onSuccess: async () => {
      const token = await getAuthToken();
      if (token) await syncCookie(token);
      queryClient.invalidateQueries({ queryKey: ["walletAccounts"] });
    },
  });
}

// Social auth mutations

export function useSocialAuth() {
  return useMutation({
    mutationFn: (provider: SocialProvider) =>
      authenticateWithSocial({
        provider,
        redirectUrl: window.location.href,
      }),
  });
}

function cleanOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("dynamicOauthCode");
  url.searchParams.delete("dynamicOauthState");
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Poll until the Dynamic SDK reports the user as signed in (up to ~5s).
 * Used as a safety net when detectOAuthRedirect fails (e.g. new tab
 * where sessionStorage is empty).
 */
async function waitForSignedIn(): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    if (isSignedIn()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export function useCompleteSocialAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await waitForClientInitialized();
      const url = new URL(window.location.href);

      let isReturning: boolean;
      try {
        isReturning = await detectOAuthRedirect({ url });
      } catch (err) {
        if (err instanceof MissingRedirectStorageStateError) {
          // OAuth state lost (e.g. callback opened in new tab).
          // Wait for SDK to finish background auth, then sync cookie.
          if (!(await waitForSignedIn())) return false;
          const jwt = await getAuthToken();
          if (jwt) await syncCookie(jwt);
          cleanOAuthParams();
          return true;
        }
        throw err;
      }

      if (!isReturning) return false;

      await completeSocialAuthentication({ url });

      const jwt = await getAuthToken();
      if (jwt) await syncCookie(jwt);

      cleanOAuthParams();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletAccounts"] });
    },
  });
}

// JWT auth mutations

export function useJwtAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jwt: string) => signInWithExternalJwt({ externalJwt: jwt }),
    onSuccess: async () => {
      const token = await getAuthToken();
      if (token) await syncCookie(token);
      queryClient.invalidateQueries({ queryKey: ["walletAccounts"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logout();
      await clearAuthCookie();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// Wallet mutations

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chain: Chain) => createWaasWalletAccounts({ chains: [chain] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletAccounts"] });
    },
  });
}

// Transaction mutations

export function useSendUsdcTransaction() {
  return useMutation({
    mutationFn: (params: SendUsdcTransactionParams) =>
      sendUsdcTransaction(params),
  });
}
