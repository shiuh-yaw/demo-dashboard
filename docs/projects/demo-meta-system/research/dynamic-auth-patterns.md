# Dynamic Labs Next.js Auth Patterns — Research for `createDemoMiddleware`

**Status:** Research only. Uncommitted. Informs Phase 1D's `createDemoMiddleware` factory.
**Date:** 2026-05-05
**Author:** Research agent (Phase 1D pre-flight)

---

## TL;DR

1. **Dynamic does not publish a Next.js middleware factory.** The official docs cover JWT verification, cookie storage, OAuth detection, and provider setup, but middleware is left entirely to the app. There is no SDK-side opinion on per-config-id sticky cookies, OAuth-callback exemptions, or `returnTo` round-trip.
2. **The SDK's canonical JWT cookie name is `DYNAMIC_JWT_TOKEN`** (capital, underscore). Our codebase uses `dynamic_jwt` (lowercase). These are intentionally different cookies — Dynamic's `DYNAMIC_JWT_TOKEN` is set by the SDK itself in sandbox or by Dynamic's first-party-cookie backend in live; our `dynamic_jwt` is an app-managed HttpOnly mirror written by `/api/auth/sync-cookie`. **D-008 is consistent with Dynamic's recommendations** because it solves a problem Dynamic doesn't address (Edge-runtime middleware needs cookie presence; the SDK's `DYNAMIC_JWT_TOKEN` is non-HttpOnly).
3. **OAuth callback uses `dynamicOauthCode` + `dynamicOauthState` URL params** (camelCase, Dynamic-specific). The `code`+`state` exemption in our middlewares is leftover from the OAuth provider's hop and should be retained as a defensive default.
4. The **demoType-derived cookie name knob in Phase 1D's spec is fine, but the underscore form (`<demoType>_config_id`) is more idiomatic** than the hyphen form (`visa-direct_config_id`). Cookies legally allow hyphens; both work; underscore matches existing visa-direct pattern.
5. **Recommendation:** Make the factory's defaults match visa-direct's behavior (cookie-sync + path/query config-id), and add three knobs: `configIdSource: 'query' | 'path' | 'both' | 'none'`, `oauthCallbackExemptParams` (default `['dynamicOauthCode', 'dynamicOauthState', 'code', 'state']`), and `carryReturnTo: boolean` (default `true`).

---

## Section 1 — Dynamic's recommended Next.js auth pattern

### Sources consulted

- Dynamic docs index — https://www.dynamic.xyz/docs/llms.txt
- JWT tokens — https://www.dynamic.xyz/docs/overview/authentication/tokens
- Backend protection — https://www.dynamic.xyz/docs/overview/authentication/dynamic-auth/protect-servers
- Cookie authentication (overview) — https://www.dynamic.xyz/docs/overview/authentication/cookie-authentication
- React cookie auth — https://www.dynamic.xyz/docs/react/authentication-methods/cookie-authentication
- JS cookie auth — https://www.dynamic.xyz/docs/javascript/authentication-methods/cookie-authentication
- NextAuth recipe — https://www.dynamic.xyz/docs/recipes/frameworks/next-auth
- Social/OAuth — https://www.dynamic.xyz/docs/react/authentication-methods/social
- SDK source (workspace-resolvable):
  - `apps/visa-direct/node_modules/@dynamic-labs-sdk/client/dist/exports/index.d.ts`
  - `apps/visa-direct/node_modules/@dynamic-labs-sdk/client/dist/exports/core.d.ts`
  - `apps/visa-direct/node_modules/@dynamic-labs-sdk/client/dist/getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js`
  - `apps/visa-direct/node_modules/@dynamic-labs-sdk/client/dist/index.esm.js`

### 1.1 Provider setup

The NextAuth recipe documents the provider as a client component:

```js
<DynamicContextProvider
  settings={{
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    walletConnectors: [EthereumWalletConnectors],
  }}
>
  {children}
</DynamicContextProvider>
```
*— [next-auth recipe](https://www.dynamic.xyz/docs/recipes/frameworks/next-auth)*

Our apps use the lower-level SDK (`@dynamic-labs-sdk/client`) instead of the React-core context provider, but the principle is identical: env id + connectors at root. Phase 1D's `<DynamicAuthProvider>` HOC wraps this.

### 1.2 JWT cookie — what Dynamic does

There are **two distinct cookie modes** in Dynamic, easily conflated:

#### Mode A — Default (localStorage JWT)

The minified JWT lives in localStorage. The SDK does **not** set a server-readable cookie. SSR/middleware cannot read auth state without an app-side helper.

#### Mode B — Cookie authentication (opt-in, requires custom domain)

Per [Cookie authentication overview](https://www.dynamic.xyz/docs/overview/authentication/cookie-authentication):
- Cookie name: **`DYNAMIC_JWT_TOKEN`** — *"contains the minified Dynamic JWT"*
- In **`live`** environment: set as a "first-party, secure, HttpOnly cookie" via `Set-Cookie` from Dynamic's backend on a customer-controlled subdomain (CNAME'd to Dynamic).
- In **`sandbox`**: the SDK falls back to `document.cookie` because Redcoast (Dynamic's auth backend) cannot set cross-domain cookies in sandbox.

Confirmed in SDK source — `getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js:411`:
```js
const DYNAMIC_AUTH_COOKIE_NAME = "DYNAMIC_JWT_TOKEN";
```
…and `:622`:
```js
if (minifiedJwt && isCookieEnabled(client))
  setCookie(`${DYNAMIC_AUTH_COOKIE_NAME}=${minifiedJwt}; expires=${sessionExpiresAt.toUTCString()}; path=/; SameSite=Lax`);
```

Note attributes the SDK sets when it falls back to `document.cookie`:
- `path=/`
- `SameSite=Lax`
- `expires=<JWT exp>`
- **No `Secure` flag** (`document.cookie` cannot set HttpOnly; `Secure` could be added but isn't)
- **No `HttpOnly`** (impossible from `document.cookie`)

Mode B is **not what our apps use today.** None of our apps configure `apiBaseUrl` to a custom domain, so we are entirely in Mode A. We solve the SSR-readable-cookie problem ourselves with `/api/auth/sync-cookie` writing an app-managed `dynamic_jwt` HttpOnly cookie. **This is consistent with Dynamic's design** — Dynamic's docs explicitly note that without cookie auth enabled, the backend must consume `Authorization: Bearer <token>` headers (not feasible in Next.js middleware).

### 1.3 Server-side JWT verification

Per [tokens docs](https://www.dynamic.xyz/docs/overview/authentication/tokens):

> "No Dynamic SDK is required on the server. Use any JWT library that supports RS256."

Recommended snippet (verbatim):
```js
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${YOUR_DYNAMIC_ENV_ID}/.well-known/jwks`;
const client = new JwksClient({ jwksUri: jwksUrl });
const signingKey = await client.getSigningKey();
const publicKey = signingKey.getPublicKey();
const decodedToken = jwt.verify(encodedJwt, publicKey);
```

Per [protect-servers docs](https://www.dynamic.xyz/docs/overview/authentication/dynamic-auth/protect-servers):

> "You must verify that the JWT scope list includes `user:basic`."

Our `packages/dynamic/src/jwt.ts` matches this pattern exactly (lines 13–14, 50–113), with multi-tenant JWKS caching. **However: we currently do not check the `scope` claim for `user:basic`.** That's a separate finding worth flagging to the team — outside the middleware factory's scope but a real gap.

Required claims documented:
- `sub` — Dynamic user ID
- `exp` — Unix expiry timestamp
- `environment_id` — project env id
- `verified_credentials` — wallets/socials list

### 1.4 Middleware patterns

**Dynamic does not publish a Next.js middleware factory.** The NextAuth recipe references middleware only via NextAuth's `authorized({ request, auth })` callback, not Dynamic's own middleware. There is no first-party Next.js example showing:
- Cookie presence checks at the Edge
- Per-config-id sticky cookies
- OAuth callback exemption logic
- `returnTo` round-trips
- Public-route allowlists

This space is entirely app-defined. **D-008 (visa-direct cookie pattern) is therefore an internal convention with no upstream conflict, but also no upstream endorsement.**

### 1.5 OAuth callback URL convention

From SDK source (`index.esm.js:1684–1704`):
```js
const detectOAuthRedirect = async ({ url }, client) => {
  const dynamicOauthState = url.searchParams.get("dynamicOauthState");
  const dynamicOauthCode  = url.searchParams.get("dynamicOauthCode");
  if (!dynamicOauthState || !dynamicOauthCode) return false;
  ...
};
```

Dynamic's OAuth flow:
1. App calls `authenticateWithSocial(...)` — SDK redirects user to OAuth provider with provider-native `code`/`state` params being part of *that* leg.
2. OAuth provider redirects back to **Dynamic's backend** with `code`+`state`.
3. Dynamic's backend redirects user back to the app with `dynamicOauthCode`+`dynamicOauthState`.
4. App calls `detectOAuthRedirect({ url })` then `completeSocialAuthentication({ url })` on mount.

So the URL params our middleware needs to be aware of are **`dynamicOauthCode` and `dynamicOauthState`**, not `code`/`state`. The latter would only appear if the app itself proxied an OAuth callback (which Dynamic flows do not). Some apps do also clean up `code`/`state` from the URL (visa-direct `hooks/use-mutations.ts`) — that's defensive cleanup of *other* flows, not Dynamic's.

The callback URL itself is **app-controlled**: app provides any path, registers it as the redirect URL in the Dynamic dashboard for each OAuth provider. There is no canonical Next.js path Dynamic mandates (no `/api/auth/callback/dynamic` convention). Apps typically use the same `/login` route — Dynamic appends the params and the page detects them on mount.

---

## Section 2 — Specific divergences in our code

### Finding 1: Trade — `?id=` query alone does NOT set the `trade_config_id` cookie

**Source:** `apps/trade/middleware.ts:30–35, 49–58`

```ts
const queryConfigId = request.nextUrl.searchParams.get("id");
const cookieConfigId = request.cookies.get(TRADE_CONFIG_COOKIE)?.value;
const resolvedConfigId = routeInfo?.configId ?? queryConfigId ?? cookieConfigId;
// ...
const attachConfigCookie = (response: NextResponse) => {
  if (routeInfo?.configId) {  // ← only sets cookie when path matches /t/<id>
    response.cookies.set(TRADE_CONFIG_COOKIE, routeInfo.configId, ...);
  }
  return response;
};
```

Compare visa-direct (`apps/visa-direct/middleware.ts:42–48`), which sets the cookie on `?id=` query too.

#### Dynamic's position

**Dynamic does not address this at all.** Per-config-id cookies are an app-level concern (D-008, an internal decision). The SDK has no notion of multi-tenant within a single environment ID.

#### Conclusion

**The factory should expose a `configIdSource` knob.** Trade's path-only behavior is intentional — the URL `/t/<id>/...` is the canonical entry point and `?id=` would conflict with the SDK's internal query state. Visa-direct's query-driven behavior is intentional too — visa-direct has no `/v/<id>/...` route.

Recommended knob signature:
```ts
configIdSource?: 'query' | 'path' | 'both' | 'none';
// 'query'  → only ?id= sets cookie (visa-direct default)
// 'path'   → only /<prefix>/<id>/* sets cookie (trade)
// 'both'   → either sets cookie, path wins on collision
// 'none'   → factory ignores config-id entirely (remittance, see Finding 2)
```

If `path`, the caller also supplies `pathConfigPrefix` (e.g. `/t`, `/r`, `/e`) and `parseConfigPath?: (path) => { configId, strippedPath } | null`.

### Finding 2: Remittance — header-only forwarding, NO cookie sync at all

**Source:** `apps/remittance/middleware.ts:22–32`

```ts
const configId = request.nextUrl.searchParams.get("id");
const configPathMatch = path.match(/^\/r\/([^/]+)/);
const pathConfigId = configPathMatch?.[1];
const resolvedConfigId = pathConfigId ?? configId;
if (resolvedConfigId) {
  requestHeaders.set("x-remittance-config-id", resolvedConfigId);
}
// (no response.cookies.set call anywhere)
```

#### Dynamic's position

**No position.** Sticky vs stateless config selection is an app concern.

#### Analysis

Stateless mode has a real benefit: deep-links like `/r/abc/dashboard?id=xyz` always honor the URL, never the cookie. Sticky cookies introduce subtle bugs when users switch demos in different tabs or after a Dynamic re-auth replaces the URL. Remittance opted for stateless on purpose.

#### Conclusion

The factory's default (cookie + header) covers visa-direct/trade; the `configIdSource: 'none'` value (or a separate `stickyConfigCookie?: boolean`) covers remittance.

Recommended knob signature (alternative — orthogonal to source):
```ts
stickyConfigCookie?: boolean; // default: true
// true  → write cookie when configId resolves (visa-direct, trade)
// false → header-only forwarding, no cookie writes (remittance)
```

If `false`, the cookie name is irrelevant and the factory does no `Set-Cookie` work.

### Finding 3: Earn — `/e/<id>/*` allowlist applies to OAuth callback routes

**Source:** `apps/earn/src/middleware.ts:36–57`

The `/e/<id>/*` block has no escape hatch for OAuth params. If a user arrives at `/e/abc/some-other-page?dynamicOauthCode=...&dynamicOauthState=...` (which shouldn't happen in practice — Dynamic's redirect URI is registered, not arbitrary), the redirect to `/e/abc/earn` would strip the OAuth params before the client could process them. In practice this is not hit because the redirect URI is `/e/abc/login` (allowlisted, line 44).

Comparison: visa-direct (`apps/visa-direct/middleware.ts:54–57`) and trade (`apps/trade/middleware.ts:44–47`) both have an `isOAuthCallback` guard that bypasses the "already authenticated → redirect away" branch. Earn does not because its login route `/e/<id>/login` is in the allowlist anyway.

#### Dynamic's position

The OAuth callback URL is app-defined. Dynamic's docs do not prescribe specific public routes or middleware exemption logic. The only invariant from the SDK side: **`dynamicOauthCode` + `dynamicOauthState`** params must reach the page that calls `detectOAuthRedirect`/`completeSocialAuthentication`.

#### Conclusion

The factory should:
1. Treat presence of `dynamicOauthCode` (and `dynamicOauthState`) on a public/login route as a signal **not** to redirect-away even if the auth cookie exists (visa-direct line 59 pattern).
2. Optionally accept a `oauthCallbackParams: string[]` knob (default `['dynamicOauthCode']`, with `code`+`state` as a defensive fallback if the team wants to keep that compatibility).
3. Not invent special OAuth paths. The redirect URI is whatever the app registered with Dynamic.

Recommended knob signature:
```ts
oauthCallbackParams?: string[];
// default: ['dynamicOauthCode']
// presence of ANY listed param on a login/public route means
// "OAuth in progress — do not redirect even if auth cookie is set"
```

Optionally include `dynamicOauthState` for completeness, and keep `code`+`state` *out* of the default (they aren't Dynamic's params; they were a leftover from another flow).

### Finding 4: Earn — middleware does NOT carry `returnTo` on auth-redirect

**Source:** `apps/earn/src/middleware.ts:61–69`

```ts
if (!hasCookie) {
  return NextResponse.redirect(new URL("/login", request.url));
}
// Has cookie - server components will verify token validity
// Redirect to /earn (the only valid authenticated route for default dashboard)
if (pathname !== "/earn") {
  return NextResponse.redirect(new URL("/earn", request.url));
}
```

No `returnTo` query param is set. Compare visa-direct (`middleware.ts:88–91`) and trade (`middleware.ts:91–99`) which both encode the original path:

```ts
loginUrl.searchParams.set("returnTo", returnTo);
```

#### Dynamic's position

**No position.** `returnTo` is a generic Next.js auth pattern, unrelated to Dynamic's flows.

#### Analysis

Earn's URL space is artificially flat (everything redirects to `/earn`), so `returnTo` would be vestigial — there's nowhere else to return to. For demos with richer route trees (visa-direct's `/payment-methods`, `/transactions`, `/onramp`; trade's `/portfolio`, `/positions`), `returnTo` is essential UX.

#### Conclusion

The factory should carry `returnTo` by default. Apps with single-page auth flows can opt out.

Recommended knob signature:
```ts
carryReturnTo?: boolean; // default: true
returnToFallback?: string; // default: defaultReturnPath
```

When `false`, `?returnTo=<encoded>` is omitted from the login redirect.

---

## Section 3 — Cookie name convention

### Current state

- visa-direct: `visa_direct_config_id` (manually written, underscore form)
- Phase 1D spec proposes derivation from `demoType`, e.g. `<demoType>_config_id` → produces `visa-direct_config_id` if `demoType = 'visa-direct'` (hyphen)

### Dynamic's position

Dynamic uses **`DYNAMIC_JWT_TOKEN`** for its own auth cookie (uppercase, underscore). Our app cookie `dynamic_jwt` is intentionally distinct — it's the HttpOnly app-managed mirror, not Dynamic's own cookie. Dynamic does **not** prescribe naming conventions for app-managed cookies.

RFC 6265 allows hyphens in cookie names (they are token characters per RFC 2616 §2.2). Both `visa-direct_config_id` and `visa_direct_config_id` are syntactically valid.

### Practical considerations

- **Underscore form** matches visa-direct's existing cookie (`visa_direct_config_id`) and Dynamic's own naming (`DYNAMIC_JWT_TOKEN`). Migration is zero-friction for visa-direct.
- **Hyphen form** matches `demoType` directly (no transformation). Avoids the `'visa-direct' → 'visa_direct'` substitution step.

### Conclusion

**Use the underscore form.** Recommendation:

```ts
const cookieName = `${demoType.replace(/-/g, '_')}_config_id`;
// 'visa-direct' → 'visa_direct_config_id'
// 'trade'       → 'trade_config_id'
// 'earn'        → 'earn_config_id'
```

Rationale: matches existing visa-direct cookie (no migration), matches Dynamic's own naming idiom, avoids hyphens in cookie names which (while legal) some older HTTP libraries handle inconsistently. Knob `cookieName?: string` lets apps override entirely if they need to preserve a legacy value.

---

## Section 4 — Recommendations for `createDemoMiddleware`

### Refined factory signature

```ts
export interface CreateDemoMiddlewareOptions {
  /** Stable identifier for the demo. Drives cookie + header names unless overridden. */
  demoType: string;

  /** Public routes (no auth required). Default: ['/login']. Supports prefix matching. */
  publicRoutes?: string[];

  /** Default landing path after auth. Default: '/'. */
  defaultReturnPath?: string;

  /** App-managed JWT cookie name (HttpOnly mirror of Dynamic SDK token). Default: 'dynamic_jwt'. */
  authCookieName?: string;

  /** Per-config-id cookie name. Default: `${demoType.replace(/-/g, '_')}_config_id`. */
  cookieName?: string;

  /** Header name forwarded to layout. Default: `x-${demoType}-config-id`. */
  configHeaderName?: string;

  /** Where to read the config-id from. Default: 'query'. */
  configIdSource?: 'query' | 'path' | 'both' | 'none';

  /** Required if configIdSource includes 'path'. Parses path → { configId, strippedPath }. */
  parseConfigPath?: (path: string) => { configId: string; strippedPath: string } | null;

  /** Build the login URL given an optional configId. */
  buildLoginPath?: (configId?: string) => string;

  /** Whether to write the config cookie when a configId resolves. Default: true. */
  stickyConfigCookie?: boolean;

  /** Carry `?returnTo=` on auth-redirect. Default: true. */
  carryReturnTo?: boolean;

  /** URL params that signal an OAuth callback in progress. Default: ['dynamicOauthCode']. */
  oauthCallbackParams?: string[];
}
```

### Per-finding decisions

| Finding | Decision | Rationale | Knob |
|---|---|---|---|
| **F1: Trade path vs visa-direct query** | New knob | Dynamic takes no position; both patterns are valid. Apps need to opt in explicitly. | `configIdSource: 'query' \| 'path' \| 'both' \| 'none'` (default `'query'`) |
| **F2: Remittance stateless** | New knob (or value of F1) | Dynamic takes no position; stateless is a deliberate choice for deep-link-driven demos. | `stickyConfigCookie?: boolean` (default `true`), or `configIdSource: 'none'` |
| **F3: OAuth callback exemption** | Built-in | SDK uses well-defined `dynamicOauthCode`/`dynamicOauthState` params (`getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js` + `index.esm.js:1684–1704`). Factory should auto-detect these. | `oauthCallbackParams?: string[]` (default `['dynamicOauthCode']`) |
| **F4: returnTo round-trip** | Align with factory default = on | Generic Next.js UX, not a Dynamic concern; visa-direct/trade demonstrate the better default. Earn's flat URL space means `returnTo` is harmless when carried. | `carryReturnTo?: boolean` (default `true`) |
| **Cookie name (underscore vs hyphen)** | Align with current code (underscore) | No Dynamic position; matches existing visa-direct cookie + Dynamic's own naming idiom. | `cookieName?: string` (default derives from `demoType` with hyphens replaced by underscores) |

### Defaults that match D-008 (visa-direct)

```ts
{
  demoType: 'visa-direct',
  publicRoutes: ['/login'],
  defaultReturnPath: '/payment-methods',
  // implicit defaults:
  // authCookieName: 'dynamic_jwt'
  // cookieName: 'visa_direct_config_id'
  // configHeaderName: 'x-visa-direct-config-id'
  // configIdSource: 'query'
  // stickyConfigCookie: true
  // carryReturnTo: true
  // oauthCallbackParams: ['dynamicOauthCode']
}
```

This brings visa-direct's `middleware.ts` from 104 lines to ~5 lines per the Phase 1D acceptance criterion.

### Trade migration

```ts
createDemoMiddleware({
  demoType: 'trade',
  publicRoutes: ['/login'],
  defaultReturnPath: '/portfolio',
  configIdSource: 'path',
  parseConfigPath: (p) => {
    const m = p.match(/^\/t\/([^/]+)(\/.*)?$/);
    return m ? { configId: m[1]!, strippedPath: m[2] ?? '/portfolio' } : null;
  },
  buildLoginPath: (id) => id ? `/t/${id}/login` : '/login',
});
```

### Remittance migration

```ts
createDemoMiddleware({
  demoType: 'remittance',
  publicRoutes: ['/login', '/r/*/login'],
  defaultReturnPath: '/',
  stickyConfigCookie: false,            // header-only
  configIdSource: 'both',               // ?id= OR /r/<id>/*
  parseConfigPath: (p) => {
    const m = p.match(/^\/r\/([^/]+)/);
    return m ? { configId: m[1]!, strippedPath: p } : null;
  },
  buildLoginPath: (id) => id ? `/r/${id}/login` : '/login',
});
```

### Earn migration

```ts
createDemoMiddleware({
  demoType: 'earn',
  publicRoutes: ['/login', '/e/*/login'],
  defaultReturnPath: '/earn',
  configIdSource: 'path',
  parseConfigPath: (p) => {
    const m = p.match(/^\/e\/([^/]+)(\/.*)?$/);
    return m ? { configId: m[1]!, strippedPath: m[2] ?? '/earn' } : null;
  },
  buildLoginPath: (id) => id ? `/e/${id}/login` : '/login',
  // carryReturnTo: true (default) — earn currently doesn't, but enabling it
  // is harmless (everything still redirects to /earn server-side) and forward-
  // compatible with future multi-page earn demos.
});
```

The `/e/<id>/*` page-allowlist (only `/earn` and `/login` permitted under `/e/<id>`) is **not** middleware concern — it's a routing decision. The factory should not encode it. The earn app should keep its pin-down logic in a layout or page-level redirect, OR pass a `redirectMap` knob if we decide that's a common pattern. **Recommend deferring the redirect-map feature until a second app needs it.**

---

## Section 5 — Open questions

1. **Should the factory verify the JWT's `scope` claim includes `user:basic`?** Per Dynamic's [protect-servers docs](https://www.dynamic.xyz/docs/overview/authentication/dynamic-auth/protect-servers), this is a hard requirement. Our `verifyDynamicJWT` (`packages/dynamic/src/jwt.ts:96–113`) does not currently check it. Middleware can't verify (Edge runtime, no JWKS), but `getAuthenticatedUserFromCookies` should. **Out of factory scope but worth a tracking issue.**

2. **Should `oauthCallbackParams` include `dynamicOauthState` by default?** Both params are required (per `index.esm.js:1699`: `if (!dynamicOauthState || !dynamicOauthCode) return false`). Including just `dynamicOauthCode` is sufficient for "is this OAuth-related" detection, but stricter detection (`AND` of both) is more precise. **Recommend default = `['dynamicOauthCode']` (presence-based, OR semantics) for robustness during partial param truncation; document clearly.**

3. **Should the factory detect Dynamic's `DYNAMIC_JWT_TOKEN` cookie when present, in addition to `dynamic_jwt`?** Apps using cookie-mode (Mode B) would set `DYNAMIC_JWT_TOKEN` instead of `dynamic_jwt`. Today no app uses Mode B (no `apiBaseUrl` configured), but a future demo might. **Recommend: leave `authCookieName` as a single string; document that cookie-mode users override to `'DYNAMIC_JWT_TOKEN'`. Don't try to dual-detect — adds branching for a hypothetical case.**

4. **What's the canonical OAuth redirect URI?** Apps register a URL with Dynamic's dashboard for each social provider. Currently each app uses `/login` (or `/r/<id>/login`, `/e/<id>/login`, `/t/<id>/login`). There's no Dynamic-recommended path. **Recommend documenting in `packages/dynamic/AGENTS.md`: "OAuth redirect URI is the login route. The factory's public-routes default already covers it."**

5. **D-008 says "underscore" cookies; the Phase 1D spec's example produces hyphen. Is the spec wrong or D-008 wrong?** D-008 doesn't actually specify underscore vs hyphen — it just says `<demoType>_config_id`. The current visa-direct cookie is underscore. **Recommend: amend Phase 1D spec to clarify the substitution rule (`hyphens → underscores`), update `cookieName` default accordingly. No D-008 change needed.**

6. **Does Dynamic recommend setting `Secure` on the JWT cookie outside production?** Our `setDynamicJWT` (`apps/visa-direct/lib/auth/session.ts:31`) does `secure: env.NODE_ENV === "production"`. Dynamic's docs only describe their own cookie ("secure, HttpOnly") in live mode. **No conflict; current pattern is correct.**

7. **How to handle the `code`+`state` legacy exemption?** Visa-direct/trade middlewares treat `code+state` as OAuth-in-progress. SDK-wise this is wrong (Dynamic uses `dynamicOauthCode`/`dynamicOauthState`). It's likely defensive code for an older SDK version or another OAuth flow. **Recommend: factory default omits `code`/`state`. Apps that need them pass explicitly: `oauthCallbackParams: ['dynamicOauthCode', 'code', 'state']`. Reduces hidden behavior.**

---

## Appendix — Citations index

| Claim | Source |
|---|---|
| `DYNAMIC_JWT_TOKEN` is the SDK cookie name | `getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js:411` |
| SDK sets cookie via `document.cookie`, not Set-Cookie, in sandbox | `getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js:8–10`, docs confirmation |
| SDK cookie attributes: `path=/; SameSite=Lax; expires=<JWT exp>` | `getVerifiedCredentialForWalletAccount-B5WBFgF2.esm.js:622` |
| OAuth params are `dynamicOauthCode` + `dynamicOauthState` | `index.esm.js:1684–1704` |
| Cookie auth is opt-in, requires custom domain | https://www.dynamic.xyz/docs/overview/authentication/cookie-authentication |
| In live, Dynamic backend sets HttpOnly first-party cookie | https://www.dynamic.xyz/docs/overview/authentication/cookie-authentication |
| In sandbox, SDK falls back to `document.cookie` | https://www.dynamic.xyz/docs/overview/authentication/cookie-authentication |
| JWKS URL: `https://app.dynamic.xyz/api/v0/sdk/{envId}/.well-known/jwks` | https://www.dynamic.xyz/docs/overview/authentication/tokens |
| Backend verification uses `jsonwebtoken` + `jwks-rsa` (no Dynamic SDK) | https://www.dynamic.xyz/docs/overview/authentication/tokens |
| JWT must include `user:basic` in scope | https://www.dynamic.xyz/docs/overview/authentication/dynamic-auth/protect-servers |
| No Next.js middleware factory in Dynamic's docs or SDK | Inspection of `dist/exports/index.d.ts` (162 lines, no middleware export); `dist/exports/core.d.ts` (164 lines, no middleware export); doc index `https://www.dynamic.xyz/docs/llms.txt` returned no middleware URL |
| Provider setup pattern | https://www.dynamic.xyz/docs/recipes/frameworks/next-auth |
