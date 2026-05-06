"use server";

/**
 * Session Management — server actions for syncing Dynamic JWT to httpOnly cookie.
 * Thin wrapper over `@dynamic-demos/dynamic/auth-cookies`.
 */

import { cookies } from "next/headers";
import {
  setDynamicJwtCookie,
  clearDynamicJwtCookie,
} from "@dynamic-demos/dynamic/auth-cookies";

export async function setDynamicJWT(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    await setDynamicJwtCookie(cookieStore, token);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set auth cookie",
    };
  }
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  await clearDynamicJwtCookie(cookieStore);
}
