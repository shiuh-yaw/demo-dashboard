"use client";

import { useCallback } from "react";
import { logout as dynamicLogout } from "@/lib/dynamic";
import { clearAuthCookie } from "@/lib/auth/session";

export function useAuth() {
  const handleLogout = useCallback(async () => {
    await dynamicLogout();
    await clearAuthCookie();
    window.location.href = "/login";
  }, []);

  return { logout: handleLogout };
}
