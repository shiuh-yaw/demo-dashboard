"use client";

/**
 * Hook to get user profile info from Dynamic SDK.
 * Extracts name and avatar from OAuth verified credentials.
 */

import { useEffect, useState } from "react";
import {
  getDynamicClient,
  waitForClientInitialized,
  checkAuthStatus,
} from "@/lib/dynamic";

interface UserProfile {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface UseUserProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
}

interface OAuthCredential {
  format: string;
  oauthProvider?: string | null;
  oauthDisplayName?: string | null;
  oauthUsername?: string | null;
  oauthAccountPhotos?: string[] | null;
}

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        await waitForClientInitialized();

        if (!checkAuthStatus()) {
          setIsLoading(false);
          return;
        }

        const client = getDynamicClient();
        const user = client.user;

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Find OAuth credential (Google)
        const oauthCred = user.verifiedCredentials?.find(
          (cred) => cred.format === "oauth" && cred.oauthProvider === "google",
        ) as OAuthCredential | undefined;

        setProfile({
          displayName:
            oauthCred?.oauthDisplayName || user.email?.split("@")[0] || null,
          email: oauthCred?.oauthUsername || user.email || null,
          avatarUrl: oauthCred?.oauthAccountPhotos?.[0] || null,
        });
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  return { profile, isLoading };
}
