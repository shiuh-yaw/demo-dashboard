"use client";

/**
 * Login Cleanup Component
 *
 * Removes the loggedOut query parameter from the URL after page load
 * to clean up the URL without causing a redirect loop
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginCleanup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If loggedOut parameter is present, remove it from URL
    if (searchParams.get("loggedOut")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("loggedOut");
      // Replace URL without causing a page reload
      router.replace(url.pathname + url.search);
    }
  }, [searchParams, router]);

  return null;
}
