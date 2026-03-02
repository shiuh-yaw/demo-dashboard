"use client";

/**
 * Hook to detect and complete OAuth redirects on the login page.
 *
 * Handles multiple scenarios:
 * 1. OAuth params present, state valid → complete OAuth
 * 2. OAuth params present, state consumed → check if already authenticated
 * 3. No OAuth params → check if already authenticated
 */

import { useEffect, useRef, useState } from "react";
import {
  completeSocialAuthentication,
  detectOAuthRedirect,
  MissingRedirectStorageStateError,
} from "@dynamic-labs-sdk/client";
import {
  waitForClientInitialized,
  getAuthToken,
  checkAuthStatus,
} from "@/lib/dynamicClient";
import { setDynamicJWT } from "@/lib/auth/session";

interface UseCompleteSocialAuthOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseCompleteSocialAuthResult {
  isLoading: boolean;
  error: Error | null;
}

// Check if URL has OAuth parameters
function hasOAuthParams(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("dynamicOauthCode") ||
    (params.has("code") && params.has("state"))
  );
}

export function useCompleteSocialAuth(
  options: UseCompleteSocialAuthOptions = {},
): UseCompleteSocialAuthResult {
  const { onSuccess, onError } = options;
  // Start with false to avoid hydration mismatch (server doesn't have window)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double handling in strict mode
    if (handledRef.current) return;
    handledRef.current = true;

    // Check for OAuth params and set loading immediately (after hydration)
    const oauthParams = hasOAuthParams();
    if (oauthParams) {
      setIsLoading(true);
    }

    async function handleOAuthRedirect() {
      try {
        // Wait for Dynamic client to be initialized
        await waitForClientInitialized();

        // Helper to handle successful auth - syncs cookie and triggers callback
        const handleAuthSuccess = async () => {
          const jwt = getAuthToken();
          if (jwt) {
            await setDynamicJWT(jwt);
          }
          onSuccess?.();
        };

        const currentUrl = new URL(window.location.href);

        // Check if this is an OAuth redirect
        let isReturning: boolean;
        try {
          isReturning = await detectOAuthRedirect({ url: currentUrl });
        } catch (err) {
          if (err instanceof MissingRedirectStorageStateError) {
            // State is missing - OAuth might have been completed elsewhere
            // Check if user is already authenticated (with retries for SDK timing)
            for (let attempt = 0; attempt < 5; attempt++) {
              if (checkAuthStatus()) {
                await handleAuthSuccess();
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
            // Not authenticated, show login
            setIsLoading(false);
            return;
          }
          throw err;
        }

        if (!isReturning) {
          // Not an OAuth redirect - check if user is already authenticated
          const hadOAuthParams = hasOAuthParams();

          if (hadOAuthParams) {
            // Had OAuth params but detectOAuthRedirect returned false
            // OAuth might have been completed elsewhere, retry auth check
            for (let attempt = 0; attempt < 5; attempt++) {
              if (checkAuthStatus()) {
                await handleAuthSuccess();
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } else {
            // No OAuth params - just a quick auth check
            if (checkAuthStatus()) {
              setIsLoading(true);
              await handleAuthSuccess();
              return;
            }
          }
          // Not authenticated, show login
          setIsLoading(false);
          return;
        }

        // Complete the social authentication
        await completeSocialAuthentication({ url: currentUrl });
        await waitForClientInitialized();

        // Auth completed successfully
        await handleAuthSuccess();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        setIsLoading(false);
      }
    }

    handleOAuthRedirect();
  }, [onSuccess, onError]);

  return { isLoading, error };
}
