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
import { clearAuthCookie, setDynamicJWT } from "@/lib/auth/session";
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
    onSuccess: () => {
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

function hasOAuthParams(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("dynamicOauthCode") ||
    params.has("dynamicOauthState") ||
    (params.has("code") && params.has("state"))
  );
}

async function syncAuthAndReturn(): Promise<boolean> {
  if (!isSignedIn()) return false;
  const jwt = await getAuthToken();
  if (jwt) await setDynamicJWT(jwt);
  return true;
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
          // OAuth state lost (e.g. new tab, sessionStorage cleared) - check if already authenticated
          for (let i = 0; i < 5; i++) {
            if (await syncAuthAndReturn()) return true;
            await new Promise((r) => setTimeout(r, 200));
          }
          return false;
        }
        throw err;
      }

      if (!isReturning) {
        if (hasOAuthParams()) {
          for (let i = 0; i < 5; i++) {
            if (await syncAuthAndReturn()) return true;
            await new Promise((r) => setTimeout(r, 200));
          }
        }
        return false;
      }

      await completeSocialAuthentication({ url });

      // Sync JWT to cookie before redirect so server sees auth on next request
      const jwt = await getAuthToken();
      if (jwt) await setDynamicJWT(jwt);

      // Clean OAuth params from URL to prevent re-processing on refresh
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("dynamicOauthCode");
      cleanUrl.searchParams.delete("dynamicOauthState");
      cleanUrl.searchParams.delete("code");
      cleanUrl.searchParams.delete("state");
      window.history.replaceState({}, "", cleanUrl.toString());

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
    onSuccess: () => {
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
