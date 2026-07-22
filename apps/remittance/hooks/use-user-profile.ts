"use client";

/**
 * User profile info from the Dynamic client - display name and avatar
 * come from the OAuth verified credential (Google) when present, email
 * from either source. Ported from earn's hook of the same name.
 */

import { useEffect, useState } from "react";
import { isSignedIn, waitForClientInitialized } from "@/lib/dynamic";
import { getClient } from "@/lib/dynamic/client";

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

        if (!isSignedIn()) {
          setIsLoading(false);
          return;
        }

        const user = getClient()?.user;
        if (!user) {
          setIsLoading(false);
          return;
        }

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
        // Silently fail - the menu falls back to the wallet address.
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  return { profile, isLoading };
}
