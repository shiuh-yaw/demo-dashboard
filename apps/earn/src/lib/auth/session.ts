"use server";

/**
 * Session Management
 *
 * Server actions for managing authentication sessions via cookies.
 *
 * The cookie name + attributes are declared inline (not opaque-imported)
 * so reviewers can grep this file for the canonical Dynamic-recommended
 * defaults (per docs/projects/demo-meta-system/research/dynamic-auth-patterns.md):
 *
 *   - name:     `dynamic_jwt` (HttpOnly mirror; D-008)
 *   - max-age:  7 days (clamped from JWT exp by the package helper)
 *   - httpOnly: true
 *   - sameSite: "lax"
 *   - secure:   env.NODE_ENV === "production"
 *   - path:     "/"
 *
 * Verification + read helpers come from `@dynamic-demos/dynamic` (Edge-safe
 * Node-runtime JWKS path).
 */

import { cookies } from "next/headers";
import {
  verifyDynamicJWT,
  getJWTFromCookies,
  type DynamicJwtPayload,
} from "@dynamic-demos/dynamic";
import { env } from "@/env";

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MIN_COOKIE_MAX_AGE = 60;

import jwt from "jsonwebtoken";

function computeMaxAge(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      return Math.max(
        MIN_COOKIE_MAX_AGE,
        Math.min(remaining, DEFAULT_COOKIE_MAX_AGE),
      );
    }
  } catch {
    // ignore decode errors
  }
  return DEFAULT_COOKIE_MAX_AGE;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Set Dynamic JWT token in cookie after successful authentication.
 * Cookie maxAge is synced with JWT expiration to prevent stale cookies.
 */
export async function setDynamicJWT(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: computeMaxAge(token),
      path: "/",
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set auth cookie",
    };
  }
}

/**
 * Clear dashboard auth cookie (logout).
 */
export async function clearDashboardAuth(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}

/**
 * Get current authenticated user from JWT cookie.
 * Returns null if not authenticated or token is invalid/expired.
 */
export async function getCurrentUser(): Promise<DynamicJwtPayload | null> {
  const cookieStore = await cookies();
  const token = getJWTFromCookies(cookieStore);
  if (!token) return null;
  return verifyDynamicJWT(token);
}

/**
 * Clear an expired token cookie.
 */
export async function clearExpiredToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}
