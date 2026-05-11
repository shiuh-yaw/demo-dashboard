"use client";

/**
 * Auth mutations for the LoginForm surface. Earn doesn't ship
 * @tanstack/react-query (unlike remittance), so these are hand-rolled
 * mutation-shaped hooks: each exposes `mutateAsync`, `isPending`, and
 * `error` — the subset the LoginForm wiring needs.
 */

import { useCallback, useState } from "react";
import {
  authenticateWithSocial as sdkAuthenticateWithSocial,
  type SocialProvider,
} from "@dynamic-labs-sdk/client";
import { getAuthToken } from "@/lib/dynamic";
import {
  sendEmailOTP,
  verifyOTP,
  signInWithExternalJwt,
  type OTPVerification,
} from "@/lib/dynamic-auth";
import { setDynamicJWT } from "@/lib/auth/session";

interface Mutation<TArgs, TResult> {
  mutateAsync: (args: TArgs) => Promise<TResult>;
  isPending: boolean;
  error: Error | null;
}

function useAsyncMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): Mutation<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutateAsync = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setIsPending(true);
      setError(null);
      try {
        return await fn(args);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [fn],
  );
  return { mutateAsync, isPending, error };
}

export function useSendEmailOTP() {
  return useAsyncMutation<string, OTPVerification>(
    useCallback((email) => sendEmailOTP({ email }), []),
  );
}

export function useVerifyOTP() {
  return useAsyncMutation<
    { otpVerification: OTPVerification; otp: string },
    void
  >(
    useCallback(async ({ otpVerification, otp }) => {
      await verifyOTP({ otpVerification, verificationToken: otp });
      const token = await getAuthToken();
      if (token) await setDynamicJWT(token);
    }, []),
  );
}

export function useSocialAuth() {
  return useAsyncMutation<SocialProvider, void>(
    useCallback(async (provider) => {
      await sdkAuthenticateWithSocial({
        provider,
        redirectUrl: window.location.href,
      });
    }, []),
  );
}

export function useJwtAuth() {
  return useAsyncMutation<string, void>(
    useCallback(async (externalJwt) => {
      await signInWithExternalJwt({ externalJwt });
      const token = await getAuthToken();
      if (token) await setDynamicJWT(token);
    }, []),
  );
}
