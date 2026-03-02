"use client";

/**
 * Login Content Component
 *
 * Client component that handles:
 * 1. OAuth completion (when returning from Google)
 * 2. Displaying the login button
 *
 * Uses useCompleteSocialAuth hook to detect and complete OAuth redirects.
 */

import { Loader2 } from "lucide-react";
import { useCompleteSocialAuth } from "@/hooks/use-complete-social-auth";
import { LoginButton } from "@/components/login-button";

interface LoginContentProps {
  /** Server-detected OAuth callback - show spinner immediately */
  isOAuthCallback?: boolean;
  /** Custom redirect URL after login (default: /earn) */
  redirectTo?: string;
}

export function LoginContent({
  isOAuthCallback = false,
  redirectTo = "/earn",
}: LoginContentProps) {
  const { isLoading, error } = useCompleteSocialAuth({
    onSuccess: () => {
      // Redirect to specified page after successful OAuth
      // Use window.location for full page reload to ensure server sees cookie
      window.location.href = redirectTo;
    },
    onError: (error) => {
      console.error("OAuth error:", error);
    },
  });

  // Show loading state while completing OAuth (unless there's an error)
  // Use server-detected isOAuthCallback OR client-detected isLoading
  if (!error && (isOAuthCallback || isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-earn-primary" />
        <p className="text-base text-earn-text-secondary">
          Completing sign in...
        </p>
      </div>
    );
  }

  // Show error if OAuth failed
  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center text-sm text-red-500">
          Sign in failed. Please try again.
        </div>
        <LoginButton />
      </div>
    );
  }

  // Show login button
  return <LoginButton />;
}
