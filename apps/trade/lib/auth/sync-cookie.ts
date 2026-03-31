/**
 * Set the Dynamic JWT cookie via a plain API route.
 *
 * Unlike the setDynamicJWT server action, this does NOT trigger
 * Next.js RSC re-rendering of the current page. Use this in auth
 * mutations to avoid redirect races during login flows.
 */
export async function syncCookie(token: string): Promise<void> {
  await fetch("/api/auth/sync-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
