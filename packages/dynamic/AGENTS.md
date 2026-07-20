---
name: "@dynamic-demos/dynamic"
kind: package
flow_role: auth
custody: n/a
status: stable
provider:
  name: Dynamic SDK (first-party)
  docs: https://docs.dynamic.xyz
  api_reference: https://docs.dynamic.xyz/api-reference
  agent_docs: none   # to be published in Phase 8 as authoritative llms.txt
  source: https://github.com/dynamic-labs/dynamic-frontend-sdk   # team has access
---

# @dynamic-demos/dynamic

Single workspace home for Dynamic-related primitives shared across demo apps. Replaces per-app boilerplate for auth middleware, JWT cookie sync, init wiring, network configuration, and credential resolution.

## Provider documentation

If you are an AI agent implementing against the Dynamic SDK, **consult the SDK source first** (D-027). The team has access to the SDK monorepo and the published packages in `node_modules/@dynamic-labs-sdk/*`. This package wraps a small, opinionated subset of the SDK; for anything not exposed here, look at the SDK source directly and either wrap the new primitive in this package or contribute upstream.

- **Main docs:** [docs.dynamic.xyz](https://docs.dynamic.xyz)
- **API reference:** [docs.dynamic.xyz/api-reference](https://docs.dynamic.xyz/api-reference)
- **Source:** team-internal access — see `provider.source` in frontmatter.
- **Agent / LLM docs:** none yet (planned Phase 8 deliverable).

## Capabilities

- `createDemoMiddleware` — Next.js middleware factory implementing the visa-direct cookie + JWT auth pattern (D-008). Supports config-prefix routes, regex public routes, functional login/return paths, and optional path rewrites. A scenario front door at `/` needs no special option: list `/` first in `publicRoutes` (earn's shape) — it becomes the derived loginPath, unauthenticated users on protected routes land there, and authenticated visitors bounce to `defaultReturnPath`.
- `createConfigForwardingMiddleware` — lighter middleware for client-side-auth apps (wallet, checkouts, shop, deposit): forwards `?theme=<configId>` as `x-<demoType>-config-id` and `?scope=<page|widget>` as `x-<demoType>-theme-scope`, both sticky-cookied across navigations; an explicit empty param clears on the same request. No auth gating, no redirects.
- JWT cookie sync — `setDynamicJwtCookie`, `clearDynamicJwtCookie`, `createSyncCookieRoute()` factory for `/api/auth/sync-cookie`.
- `<DynamicInit />` — generic client-side init component with adapters; apps inject SDK-specific `isSignedIn` / `getAuthToken` / event subscription.
- `<DynamicAuthProvider>` — opt-in HOC bundling `DynamicInit` with the children tree.
- `createNetworkConfig` — declares which chains a demo cares about, returning matching network ids; sandbox-by-default (D-005).
- `createDynamicClientSingleton` + `createSafeWrapper` / `createAsyncSafeWrapper` — lazy / SSR-safe client singleton factory and wrapper helpers shared by apps that consume the lower-level `createDynamicClient` API rather than the React-context provider. Owns the once-per-page idempotency guarantee.
- `resolveCredentials` — fallback chain: app-specific env → workspace default env → boot error (D-003).
- `verifyDynamicJWT`, `getJWTFromCookies`, `getAuthenticatedUserFromCookies` — JWT helpers (server-side) backed by the SDK's JWKS.
- `metadata.ts` exports — strongly-typed Dynamic user-metadata helpers (KYC, wallet types, deposit Fireblocks entries).

## Public surface

Stable entry points (consumed by apps):

- `@dynamic-demos/dynamic` — index barrel: types + JWT + redirect + middleware + metadata + Phase-1D primitives.
- `@dynamic-demos/dynamic/demo-middleware` — `createDemoMiddleware` only.
- `@dynamic-demos/dynamic/auth-cookies` — cookie writers + sync-cookie route factory.
- `@dynamic-demos/dynamic/init` — `<DynamicInit />`.
- `@dynamic-demos/dynamic/auth-provider` — `<DynamicAuthProvider>`.
- `@dynamic-demos/dynamic/networks` — `createNetworkConfig` + chain ids.
- `@dynamic-demos/dynamic/resolve-credentials` — `resolveCredentials`.
- `@dynamic-demos/dynamic/client-singleton` — `createDynamicClientSingleton`, `createSafeWrapper`, `createAsyncSafeWrapper`.
- `@dynamic-demos/dynamic/client` — client-only barrel: `ConnectedAuthScreen`, `useAuthForm`, `<DynamicInit />`, `<DynamicAuthProvider>`.

Internal:

- `connected-auth-screen.tsx`, `use-auth-form.ts` — older login UX building blocks; will be revisited in Phase 4.

## Required environment

Per consumer app. The package itself only reads `process.env` inside `resolveCredentials` (which can be overridden at call site).

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env id — optional (falls back to default below).
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default Dynamic env — required if no per-app id.
- `NEXT_PUBLIC_APP_ENV` — `production` flips `isSandbox` to false; otherwise sandbox (D-005).

## Slots vs invariants

**Slots:**

- Cookie / header naming derived from `demoType` (e.g. `<demoType>_config_id`, `x-<demoType>-config-id`).
- Public-route matchers (string prefixes or regexes).
- Functional `loginPath` / `defaultReturnPath` for config-aware routes.
- `getConfigIdFromPath` and `rewritePath` for app-specific URL shapes.

**Invariants:**

- Auth cookie name defaults to `dynamic_jwt`. Apps SHOULD NOT diverge unless they fork the verifier too.
- Cookie attributes: `httpOnly: true`, `sameSite: lax`, `secure` only in production.
- Sandbox-by-default for `resolveCredentials.isSandbox`.
- The middleware never validates JWTs (that's the server component's job) — Edge runtime only checks cookie presence.
- Apps never reimplement JWT verification — always go through `verifyDynamicJWT`.

## Integration map

**Imports:** `@dynamic-demos/ui`, `jsonwebtoken`, `jwks-rsa`.
**Imported by:** every demo app that authenticates with Dynamic.

## Examples

```ts
// middleware.ts (visa-direct)
import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

export const middleware = createDemoMiddleware({
  demoType: "visa-direct",
  defaultReturnPath: "/payment-methods",
});
```

```ts
// app/api/auth/sync-cookie/route.ts
import { createSyncCookieRoute } from "@dynamic-demos/dynamic/auth-cookies";
export const POST = createSyncCookieRoute();
```

```tsx
// components/dynamic-init.tsx
"use client";
import { DynamicInit } from "@dynamic-demos/dynamic/init";
import { isSignedIn, getAuthToken, waitForClientInitialized, onEvent } from "@/lib/dynamic";
import { setDynamicJWT, clearAuthCookie } from "@/lib/auth/session";

export function AppDynamicInit() {
  return (
    <DynamicInit
      client={{ isSignedIn, getAuthToken, waitForClientInitialized, onEvent: (p) => onEvent(p as any) }}
      cookieSync={{ set: setDynamicJWT, clear: clearAuthCookie }}
    />
  );
}
```

## Do / Don't

- ✅ Do: derive cookie / header names from `demoType` via the factory — never hardcode.
- ✅ Do: keep `"use server"` boundaries inside the consuming app; the package helpers are environment-neutral.
- ✅ Do: read SDK source first when adding a new primitive (D-027).
- ❌ Don't: import from `next/headers` at module top-level here; the package supports server actions and route handlers, never client.
- ❌ Don't: pin a specific `@dynamic-labs-sdk/*` version inside this package — apps own SDK versions.
- ❌ Don't: migrate `apps/spark26` to this package. Spark26 is zero-touch (D-006).

## Open questions / known gaps

- Spark26 keeps its local Dynamic helpers (`apps/spark26/lib/dynamic/server.ts` etc.) by exception (D-006).
- The package's `<DynamicAuthProvider>` is currently a thin pass-through. If we add SDK provider context wiring (e.g. `useDynamicContext`), it should land here.
- `apps/earn` keeps bespoke WAAS / wallet-creation logic that would lose functionality if migrated to the generic primitives. Future work: extend the factory to model that pattern.
- `apps/wallet`, `apps/deposit`, `apps/checkouts`, `apps/shop`, `apps/cross-border-ap-ar` are intentionally **not** consumers of the demo-middleware / sync-cookie / `<DynamicInit />` primitives. None of them ship a Next.js `middleware.ts`, an `app/api/auth/sync-cookie/route.ts`, an `app.config.ts` slot, or a `components/dynamic-init.tsx` wrapper — they consume the Dynamic SDK as a client-side singleton without JWT cookie sync. Migrating them would require **adding** the cookie/middleware pattern, not consolidating existing duplication. (`apps/cross-border-ap-ar` does not use the Dynamic SDK at all today.) Re-evaluate when one of these apps grows JWT-protected server routes.
- **Bucket 2 — client-singleton consolidation status (Phase 1D, second pass):**
  - `apps/wallet` — full migration. `lib/dynamic/client.ts` consumes `createDynamicClientSingleton` + `createSafeWrapper` / `createAsyncSafeWrapper` and routes the env id through `resolveCredentials()`.
  - `apps/deposit` — full migration. Same shape as wallet (only `addEvmExtension`). 12 existing characterization tests still pass.
  - `apps/checkouts` — partial migration. The singleton `getClient()` and `environmentId` are package-driven; the 30+ inline SSR-safe wrappers (`getKrakenAccounts`, `getMultichainBalances`, …) keep their bespoke shapes — converting them wholesale would be churn without further consolidation.
  - `apps/shop` — partial migration. Shop uses an alternative `autoInitialize: false` + explicit `initializeClient()` flow gated by `<DynamicClientProvider>` (Spinner blocks the tree until ready). The lazy `client-singleton` factory does not model that flow today, so the bespoke `initializeDynamicClient()` stays. The smaller real consolidation in this app: env-id resolution via `resolveCredentials()` (D-003).
  - Future work: if a third app needs the `autoInitialize: false` pattern, extend `createDynamicClientSingleton` with an explicit-initialize knob and migrate shop. Until then, the bespoke initializer is correct.
