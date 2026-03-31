# Trade Middleware Review (vs Remittance)

## Summary

The trade middleware is largely aligned with remittance but has a few oddities around redirects and timing. Below are the findings and recommended fixes.

---

## 1. Double Redirect (Expired Cookie on Login)

**Issue:** When a user visits `/r/[id]/login` directly with an **expired/invalid** JWT cookie:

1. Middleware sees `hasAuthCookie` (cookie exists) and `!isOAuthCallback` → redirects to dashboard
2. Layout runs, `getServerUserData()` returns null (invalid JWT) → redirects back to login with `sessionExpired=1`
3. User ends up at login after two redirects

**Result:** Brief flash of dashboard/loading, then back to login. Feels odd.

**Remittance:** Same behavior; both apps share this pattern.

**Fix:** When on the login route, do **not** redirect to dashboard based solely on cookie presence. Allow the request through; the login page will handle it. If the session is valid, the client will redirect after auth initializes. If invalid, the user sees the login form. This removes the double redirect for the expired-cookie case.

---

## 2. sessionExpired Handling Order

**Current logic (both apps):**
```ts
if (isLoginRoute && hasAuthCookie && !isOAuthCallback) {
  if (request.nextUrl.searchParams.has("sessionExpired")) {
    // Clear cookie, allow through
    response.cookies.delete("dynamic_jwt");
    return response;
  }
  // Redirect to dashboard
  return NextResponse.redirect(...);
}
```

**Observation:** The order is correct. When `sessionExpired` is present, we clear the cookie and show login. When it’s absent, we redirect. No change needed.

---

## 3. Open Redirect via returnTo

**Issue:** `returnTo` is taken from the URL and used in `NextResponse.redirect(new URL(dest, request.url))`. A value like `//evil.com` or `https://evil.com` could lead to an open redirect.

**Current guard:** `returnToParam?.startsWith("/")` — a path starting with `/` is allowed. `//evil.com` starts with `/` and would be treated as a valid path.

**Fix:** Validate that `returnTo` is a same-origin path before redirecting, e.g.:

```ts
function isSafeRedirect(dest: string, baseUrl: URL): boolean {
  if (!dest.startsWith("/")) return false;
  try {
    const resolved = new URL(dest, baseUrl);
    return resolved.origin === baseUrl.origin;
  } catch {
    return false;
  }
}
```

---

## 4. Fallback When pathConfigId Is Missing

**Trade:** Unauthenticated user on non-`/r/[id]/*` path → redirect to `/r/default/login` with `returnTo=path`.

**Remittance:** Same case → redirect to `/login` with `returnTo` (and optional `?id=` when `configId` is in the query).

**Observation:** Trade always uses `/r/default/login`; remittance uses `/login`. This is intentional for trade’s config-based routing. No change needed.

---

## 5. Demo Mode Placement

**Trade:** Demo mode is checked first and returns early. Correct.

---

## 6. OAuth Callback Handling

**Both apps:** When `dynamicOauthCode` or `code`+`state` are present, the request is allowed through to the login page so the OAuth flow can complete. Correct.

---

## Recommended Changes

1. **Avoid double redirect:** Do not redirect away from the login route when a cookie exists; always allow through and let the login page handle valid/invalid sessions.
2. **Harden returnTo:** Validate that `returnTo` resolves to a same-origin URL before redirecting.
